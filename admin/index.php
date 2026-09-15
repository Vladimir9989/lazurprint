<?php
// Если хостинг открывает для веба всю папку admin/ (а не только admin/public/),
// этот файл перекидывает с /admin/ на рабочую панель в /admin/public/.
// Локально (php -S ... -t admin/public) он не используется и не мешает.
header('Location: public/');
exit;
