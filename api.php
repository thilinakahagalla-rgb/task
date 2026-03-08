<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$file = 'tasks.json';

// Handle GET request to read tasks
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo json_encode([]);
    }
    exit;
}

// Handle POST request to save tasks
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() === JSON_ERROR_NONE) {
        if (file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT))) {
            echo json_encode(['status' => 'success', 'message' => 'Tasks saved successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Could not write to file']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid JSON data']);
    }
    exit;
}
?>
