<?php
header("Content-Type: application/json");

echo json_encode([
    "success" => true,
    "message" => "MRD API backend is running"
]);