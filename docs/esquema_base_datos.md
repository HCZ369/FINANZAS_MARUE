## negocio
- id (PK)
- nombre
- fecha_creacion

## categoria
- id (PK)
- negocio_id
- nombre
- tipo (ingreso / gasto)

## inyeccion_capital
- id (PK)
- negocio_id
- monto
- fecha
- nota

## cliente
- id (PK)
- negocio_id
- nombre
- contacto
- fecha_nacimiento
- correo
- ruc

## producto
- id (PK)
- negocio_id
- nombre
- precio

## venta
- id (PK)
- negocio_id
- cliente_id
- fecha
- monto_total

## venta_detalle
- id (PK)
- venta_id
- producto_id
- cantidad
- precio_unitario
- subtotal

## gasto
- id (PK)
- negocio_id
- categoria_id
- monto
- fecha
- descripcion