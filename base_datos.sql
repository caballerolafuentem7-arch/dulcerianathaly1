-- ============================================================
-- BASE DE DATOS DULCERÍA NATHALY (MySQL / phpMyAdmin)
-- Normalización en 3FN con Claves Primarias, Foráneas y Procedimientos Almacenados
-- Ubicación: Barrio Metropolitano 2, Santa Cruz, Bolivia
-- ============================================================

CREATE DATABASE IF NOT EXISTS `dulceria_nathaly` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dulceria_nathaly`;

-- 1. TABLA: usuarios (Administradores y Clientes con cuenta Gmail)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre_completo` VARCHAR(100) NOT NULL,
  `correo_gmail` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol` ENUM('ADMIN', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE',
  `fecha_registro` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `chk_gmail_strict` CHECK (`correo_gmail` LIKE '%@gmail.com')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABLA: productos (Catálogo de repostería e inventario)
CREATE TABLE IF NOT EXISTS `productos` (
  `id_producto` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(120) NOT NULL,
  `descripcion` TEXT,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `stock_disponible` INT NOT NULL DEFAULT 0,
  `imagen_url` VARCHAR(255),
  `estado` ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABLA: ventas (Encabezado de facturación/comprobante)
CREATE TABLE IF NOT EXISTS `ventas` (
  `id_venta` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo_comprobante` VARCHAR(30) NOT NULL UNIQUE,
  `id_cliente` INT NOT NULL,
  `fecha_venta` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `metodo_pago` ENUM('EFECTIVO', 'QR') NOT NULL,
  `monto_total` DECIMAL(10,2) NOT NULL,
  `monto_entregado` DECIMAL(10,2) DEFAULT 0.00,
  `cambio_devuelto` DECIMAL(10,2) DEFAULT 0.00,
  `comprobante_qr_url` VARCHAR(255) NULL,
  `estado` ENUM('PAGADO', 'PENDIENTE', 'CANCELADO') DEFAULT 'PAGADO',
  FOREIGN KEY (`id_cliente`) REFERENCES `usuarios`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABLA: detalle_ventas (Líneas de productos en 3FN)
CREATE TABLE IF NOT EXISTS `detalle_ventas` (
  `id_detalle` INT AUTO_INCREMENT PRIMARY KEY,
  `id_venta` INT NOT NULL,
  `id_producto` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_historico` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`id_venta`) REFERENCES `ventas`(`id_venta`) ON DELETE CASCADE,
  FOREIGN KEY (`id_producto`) REFERENCES `productos`(`id_producto`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INSERT DATOS INICIALES DEL CATÁLOGO
-- ============================================================
INSERT INTO `usuarios` (`nombre_completo`, `correo_gmail`, `password_hash`, `rol`) VALUES
('Administrador Dulcería', 'admin@gmail.com', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1qW.X.eI0P7I.O5G7L/fU44e3Q8YqOW', 'ADMIN');

INSERT INTO `productos` (`nombre`, `descripcion`, `precio_unitario`, `stock_disponible`, `imagen_url`) VALUES
('Queques Esponjosos', 'Queque casero tradicional perfumado con cáscara de naranja.', 25.00, 15, 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e'),
('Empanadas Fritas', 'Empanadas crujientes fritas con queso criollo derretido.', 5.00, 40, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f'),
('Torta Mixta (Dulce de Leche y Chantilly)', 'Bizcochuelo súper húmedo con crema chantilly y manjar criollo.', 120.00, 6, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587'),
('Cuñapé Tradicional', 'Elaborado con almidón de yuca y abundante queso horneado.', 3.50, 60, 'https://images.unsplash.com/photo-1509440159596-0249088772ff'),
('Rosca de Maíz', 'Rosca horneada crocante de maíz y queso criollo.', 4.00, 25, 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04');

-- ============================================================
-- PROCEDIMIENTOS ALMACENADOS (STORED PROCEDURES)
-- ============================================================
DELIMITER //

CREATE PROCEDURE `sp_obtener_catalogo`()
BEGIN
    SELECT id_producto, nombre, descripcion, precio_unitario, stock_disponible, imagen_url 
    FROM productos 
    WHERE estado = 'ACTIVO';
END //

CREATE PROCEDURE `sp_registrar_venta`(
    IN p_id_cliente INT,
    IN p_codigo VARCHAR(30),
    IN p_metodo ENUM('EFECTIVO', 'QR'),
    IN p_total DECIMAL(10,2),
    IN p_entregado DECIMAL(10,2),
    IN p_cambio DECIMAL(10,2),
    IN p_comprobante_qr VARCHAR(255)
)
BEGIN
    INSERT INTO ventas (codigo_comprobante, id_cliente, metodo_pago, monto_total, monto_entregado, cambio_devuelto, comprobante_qr_url, estado)
    VALUES (p_codigo, p_id_cliente, p_metodo, p_total, p_entregado, p_cambio, p_comprobante_qr, 'PAGADO');
    
    SELECT LAST_INSERT_ID() AS id_venta_creada;
END //

CREATE PROCEDURE `sp_descontar_stock`(
    IN p_id_producto INT,
    IN p_cantidad INT
)
BEGIN
    DECLARE stock_actual INT;
    SELECT stock_disponible INTO stock_actual FROM productos WHERE id_producto = p_id_producto;
    
    IF stock_actual >= p_cantidad THEN
        UPDATE productos 
        SET stock_disponible = stock_disponible - p_cantidad 
        WHERE id_producto = p_id_producto;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Stock insuficiente para completar la venta.';
    END IF;
END //

DELIMITER ;