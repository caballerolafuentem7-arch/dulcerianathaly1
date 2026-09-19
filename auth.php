<?php
// api/auth.php - Registro estricto con Gmail y Autenticación
header('Content-Type: application/json');
require_once '../config/db.php';

$action = $_GET['action'] ?? '';

if ($action === 'register') {
    $nombre = trim($_POST['nombre'] ?? '');
    $correo = trim($_POST['correo'] ?? '');
    $password = $_POST['password'] ?? '';

    // Validar formato estricto @gmail.com
    if (!preg_match('/^[a-zA-Z0-9._%+-]+@gmail\\.com$/i', $correo)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Restricción de Seguridad: Debe ingresar un correo válido de Gmail (@gmail.com).'
        ]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE correo_gmail = :correo");
    $stmt->execute(['correo' => $correo]);
    if ($stmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'Este correo de Gmail ya se encuentra registrado.']);
        exit;
    }

    $passHash = password_hash($password, PASSWORD_BCRYPT);
    $insertStmt = $pdo->prepare("INSERT INTO usuarios (nombre_completo, correo_gmail, password_hash, rol) VALUES (:nombre, :correo, :pass, 'CLIENTE')");
    $insertStmt->execute(['nombre' => $nombre, 'correo' => $correo, 'pass' => $passHash]);

    echo json_encode(['status' => 'success', 'message' => 'Registro completado exitosamente con Gmail.']);
} 
elseif ($action === 'login') {
    $correo = trim($_POST['correo'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE correo_gmail = :correo");
    $stmt->execute(['correo' => $correo]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        echo json_encode([
            'status' => 'success',
            'usuario' => [
                'id' => $user['id_usuario'],
                'nombre' => $user['nombre_completo'],
                'correo' => $user['correo_gmail'],
                'rol' => $user['rol']
            ]
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Credenciales inválidas o cuenta inexistente.']);
    }
}
?>