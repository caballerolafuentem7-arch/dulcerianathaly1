<?php
// api/productos.php - Catálogo y Gestión de Inventario
header('Content-Type: application/json');
require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("CALL sp_obtener_catalogo()");
    $productos = $stmt->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $productos]);
} 
elseif ($method === 'POST') {
    $nombre = $_POST['nombre'];
    $precio = floatval($_POST['precio']);
    $stock = intval($_POST['stock']);
    $desc = $_POST['descripcion'];
    $img = $_POST['imagen_url'];

    $stmt = $pdo->prepare("INSERT INTO productos (nombre, descripcion, precio_unitario, stock_disponible, imagen_url) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$nombre, $desc, $precio, $stock, $img]);

    echo json_encode(['status' => 'success', 'message' => 'Producto agregado al catálogo correctamente.']);
}
?>