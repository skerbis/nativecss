<?php
/**
 * ncss - Router für den lokalen PHP-Entwicklungsserver (nur Tooling, nicht Teil von dist/).
 *
 *   php -S 127.0.0.1:8770 -t . docs-src/dev-router.php
 *
 * Der eingebaute `php -S`-Server ignoriert HTTP-Range-Anfragen (antwortet immer 200 mit der
 * ganzen Datei). Safari spielt Video/Audio dann gar nicht ab, und JEDER Browser kann darin
 * nicht zuverlässig springen - <ncss-scroll-video>, die Player und Scrollytelling mit Video
 * bleiben lokal bei 0 s stehen, obwohl der Code stimmt (GitHub Pages unterstützt Ranges, live
 * tritt das nicht auf). Dieser Router liefert Mediendateien mit 206/Content-Range aus, alles
 * andere reicht er unverändert an den eingebauten Server durch (return false).
 */

$root = realpath($_SERVER['DOCUMENT_ROOT']);
$path = realpath($root . urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)));

// Nur Mediendateien INNERHALB des Projektordners (kein Ausbruch per ../ oder Symlink)
if (!$path || strpos($path, $root . DIRECTORY_SEPARATOR) !== 0 || !is_file($path)
    || !preg_match('/\.(mp4|webm|m4a|mp3|ogg|opus|wav)$/i', $path)) {
    return false;
}

$types = [
    'mp4' => 'video/mp4', 'webm' => 'video/webm', 'm4a' => 'audio/mp4', 'mp3' => 'audio/mpeg',
    'ogg' => 'audio/ogg', 'opus' => 'audio/ogg', 'wav' => 'audio/wav',
];
$size = filesize($path);
$start = 0;
$end = $size - 1;

header('Content-Type: ' . $types[strtolower(pathinfo($path, PATHINFO_EXTENSION))]);
header('Accept-Ranges: bytes');

if (isset($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=(\d*)-(\d*)$/', $_SERVER['HTTP_RANGE'], $m)) {
    if ($m[1] === '') {
        $start = max(0, $size - intval($m[2]));
    } else {
        $start = intval($m[1]);
        if ($m[2] !== '') {
            $end = min(intval($m[2]), $size - 1);
        }
    }
    if ($start > $end || $start >= $size) {
        http_response_code(416);
        header("Content-Range: bytes */$size");
        exit;
    }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
}

header('Content-Length: ' . ($end - $start + 1));
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    exit;
}

$f = fopen($path, 'rb');
fseek($f, $start);
$left = $end - $start + 1;
while ($left > 0 && !feof($f)) {
    $chunk = fread($f, min(65536, $left));
    echo $chunk;
    $left -= strlen($chunk);
}
fclose($f);
