<?php
// api/ventas.php
header('Content-Type: application/json; charset=utf-8');
require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ==========================================
// 1. OBTENER COMPRAS DE UN CLIENTE (GET)
// ==========================================
if ($method === 'GET') {
    $id_cliente = isset($_GET['id_cliente']) ? intval($_GET['id_cliente']) : 0;

    try {
        if ($id_cliente > 0) {
            $stmt = $pdo->prepare("SELECT * FROM ventas WHERE id_cliente = :id_cliente ORDER BY id_venta DESC");
            $stmt->execute([':id_cliente' => $id_cliente]);
        } else {
            $stmt = $pdo->query("SELECT * FROM ventas ORDER BY id_venta DESC");
        }

        $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'status' => 'success',
            'data'   => $ventas
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Error al obtener ventas: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// ==========================================
// 2. REGISTRAR UNA NUEVA VENTA (POST)
// ==========================================
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    if (empty($input)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Datos inválidos o cuerpo de la petición vacío']);
        exit;
    }

    // Capturar datos del cliente enviados por JS
    $nombre_completo = trim($input['nombre_cliente'] ?? $input['nombre_completo'] ?? $input['nombre'] ?? '');
    $correo_gmail    = trim($input['email_cliente'] ?? $input['correo_gmail'] ?? $input['email'] ?? '');
    $telefono        = trim($input['telefono_cliente'] ?? $input['telefono'] ?? '');

    if (!empty($telefono) && !empty($nombre_completo)) {
        $nombre_completo .= " (Tel: {$telefono})";
    }

    try {
        $id_cliente = 0;

        // ----------------------------------------------------
        // PASO A: BUSCAR O REGISTRAR CLIENTE
        // ----------------------------------------------------
        if (!empty($correo_gmail) && !empty($nombre_completo)) {
            
            // Garantizar sufijo @gmail.com para chk_gmail_strict
            if (!preg_match('/@gmail\.com$/i', $correo_gmail)) {
                $partes = explode('@', $correo_gmail);
                $correo_gmail = $partes[0] . '@gmail.com';
            }

            $stmtUser = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE correo_gmail = ?");
            $stmtUser->execute([$correo_gmail]);
            $usuarioExistente = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if ($usuarioExistente) {
                $id_cliente = intval($usuarioExistente['id_usuario']);
                $updateUser = $pdo->prepare("UPDATE usuarios SET nombre_completo = ? WHERE id_usuario = ?");
                $updateUser->execute([$nombre_completo, $id_cliente]);
            } else {
                $insertUser = $pdo->prepare("
                    INSERT INTO usuarios (nombre_completo, correo_gmail, password_hash, rol, fecha_registro) 
                    VALUES (?, ?, '123456', 'CLIENTE', NOW())
                ");
                $insertUser->execute([$nombre_completo, $correo_gmail]);
                $id_cliente = intval($pdo->lastInsertId());
            }
        } else if (!empty($input['id_cliente'])) {
            $id_cliente = intval($input['id_cliente']);
        }

        // ----------------------------------------------------
        // PASO B: VALIDACIÓN ESTRICTA DE EXISTENCIA EN 'usuarios'
        // ----------------------------------------------------
        if ($id_cliente > 0) {
            $chkUser = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = ?");
            $chkUser->execute([$id_cliente]);
            if (!$chkUser->fetch()) {
                $id_cliente = 1; // Si el ID enviado no existe, fallback a 1
            }
        } else {
            $id_cliente = 1; // Fallback por defecto
        }

        // Asegurar la existencia física del id_usuario = 1 en caso de emergencias
        $chkBase = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE id_usuario = 1");
        $chkBase->execute();
        if (!$chkBase->fetch()) {
            $pdo->exec("
                INSERT INTO usuarios (id_usuario, nombre_completo, correo_gmail, password_hash, rol, fecha_registro) 
                VALUES (1, 'Público General', 'invitado.dulcerianathaly@gmail.com', '123456', 'CLIENTE', NOW())
            ");
            $id_cliente = 1;
        }

        // ----------------------------------------------------
        // PASO C: REGISTRAR LA VENTA
        // ----------------------------------------------------
        $codigo = 'CMP-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));

        $metodo_pago      = !empty($input['metodo_pago']) ? strtoupper(trim($input['metodo_pago'])) : 'EFECTIVO';
        $monto_total      = isset($input['monto_total']) ? floatval($input['monto_total']) : (isset($input['total']) ? floatval($input['total']) : 0.00);
        $monto_entregado  = isset($input['monto_entregado']) ? floatval($input['monto_entregado']) : $monto_total;
        $cambio_devuelto  = isset($input['cambio_devuelto']) ? floatval($input['cambio_devuelto']) : 0.00;
        $comprobante_qr   = $input['comprobante_qr'] ?? null;

        $sql = "INSERT INTO ventas (
                    id_cliente, 
                    metodo_pago, 
                    monto_total, 
                    monto_entregado, 
                    cambio_devuelto, 
                    comprobante_qr, 
                    codigo_comprobante
                ) VALUES (
                    :id_cliente, 
                    :metodo_pago, 
                    :monto_total, 
                    :monto_entregado, 
                    :cambio_devuelto, 
                    :comprobante_qr, 
                    :codigo_comprobante
                )";

        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            ':id_cliente'         => $id_cliente,
            ':metodo_pago'        => $metodo_pago,
            ':monto_total'        => $monto_total,
            ':monto_entregado'    => $monto_entregado,
            ':cambio_devuelto'    => $cambio_devuelto,
            ':comprobante_qr'     => $comprobante_qr,
            ':codigo_comprobante' => $codigo
        ]);

        $id_venta = $pdo->lastInsertId();

        echo json_encode([
            'status'          => 'success',
            'message'         => 'Venta registrada con éxito',
            'id_venta'        => $id_venta,
            'id_cliente'      => $id_cliente,
            'codigo'          => $codigo,
            'monto_total'     => $monto_total,
            'monto_entregado' => $monto_entregado,
            'cambio_devuelto' => $cambio_devuelto
        ], JSON_UNESCAPED_UNICODE);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Error en la base de datos: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}
?>