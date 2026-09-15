<?php
require_once __DIR__ . '/../src/bootstrap.php';
logout_user();
redirect('login.php');
