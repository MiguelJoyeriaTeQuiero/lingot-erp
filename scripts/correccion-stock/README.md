# Corrección de stock

Arregla el stock y los lotes que dejaron mal dos fallos ya corregidos en la migración 032:

| Fallo | Qué pasó | Qué hace la corrección |
|---|---|---|
| **Factura desde albarán** | El albarán descontó el stock y, al emitir su factura, se volvió a descontar | Devuelve al stock y al lote lo descontado de más y marca la factura (`albaran_stock_diff`) para que, si un día se borra, se deshaga bien |
| **Pedido recibido sin entrada** | La entrada falló («error en stock») pero el pedido quedó como recibido | Añade la entrada que faltó, **solo en los pedidos que confirmes** |

Lo que viene de **líneas sin lote** no se puede arreglar automáticamente: esas ventas ocurrieron de verdad. Se cuadra al final con un **Conteo de inventario** desde la app.

No toca facturas, totales, números ni huellas Veri\*factu. Cada corrección queda en el **Historial de movimientos** del producto con el motivo «Corrección: …».

## Antes de empezar

1. Aplica las migraciones **031** y **032** y despliega el código. Así no se genera más stock erróneo mientras corriges.
2. Elige un momento en que nadie esté usando el ERP.

Todo se ejecuta en Supabase → **SQL Editor**.

## Pasos

1. **Diagnóstico** (`1-diagnostico.sql`, solo lectura). Ejecuta cada consulta por separado: selecciona el bloque y pulsa *Run*.
   - **Consulta 1:** facturas con doble descuento y cuánto vuelve al stock.
   - **Consulta 2:** pedidos recibidos que quizá no sumaron. Elige cuáles no sumaron y apunta su `pedido_id`.
   - **Consulta 3:** cómo quedaría el stock de cada producto.
2. **Ensayo** (`2-correccion.sql` tal cual, con `simulacro := true`). Pega en `pedidos_confirmados` los `pedido_id` que hayas elegido. Termina con un mensaje en rojo **«SIMULACRO, no se ha aplicado nada…»** que dice cuántas unidades vuelven al stock. Comprueba que cuadra con la consulta 1 (y con los pedidos que elegiste).
3. **Aplicar.** Cambia `simulacro` a `false` y ejecuta. Sale una tabla con cada corrección; apunta el valor de la columna **`run`**.
4. **Comprobar.** Vuelve a lanzar el diagnóstico: la consulta 1 y la 2 deben salir vacías, salvo los pedidos que decidiste no corregir.
5. **Conteo de inventario** en la app para lo que siga descuadrado.

## Copia y vuelta atrás

- Antes de cambiar nada, el script guarda una foto en el esquema `backups`: `stockfix_<run>_products`, `_lots` y `_movements`. Ese esquema no es accesible desde la web ni desde la API.
- Si cualquier paso falla, no se aplica nada.
- Ejecutarlo dos veces no duplica nada: lo ya corregido se salta.
- **Para deshacer** una ejecución: abre `3-deshacer.sql`, pon el `run` en `run_a_deshacer` y ejecútalo. Revierte exactamente lo que hizo esa corrección y respeta las ventas que haya habido después.
