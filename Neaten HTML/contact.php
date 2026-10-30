<?php
// Neaten Contact Form
// Replace both email addresses with your real, configured addresses.

header('Content-Type: text/plain; charset=UTF-8');

$to = 'YOUR_INBOX@example.com';
$from = 'YOUR_VERIFIED_SENDER@example.com';
$subject = 'New Website Message | Neaten';

// Only process POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo 'failed';
    exit;
}

// Spam trap: real visitors never fill this hidden field
if (!empty($_POST['website'])) {
    echo 'sent';
    exit;
}

// Safely retrieve submitted fields
function getField($key, $maxLength = 200) {
    if (!isset($_POST[$key]) || !is_string($_POST[$key])) {
        return '';
    }
    return substr(trim($_POST[$key]), 0, $maxLength);
}

$name = str_replace(["\r", "\n"], ' ', getField('name', 100));
$email = getField('email', 150);
$phone = getField('phone', 20);
$message = getField('message', 3000);

// Validate required information
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
    echo 'failed';
    exit;
}

$email_body = "NEW WEBSITE MESSAGE - NEATEN\n";
$email_body .= "========================================\n\n";
$email_body .= "Name: " . $name . "\n";
$email_body .= "Email: " . $email . "\n";
$email_body .= "Phone: " . ($phone ?: 'Not provided') . "\n\n";
$email_body .= "MESSAGE\n" . $message . "\n\n";
$email_body .= "========================================\n";
$email_body .= "Submitted via the Neaten website contact form.\n";

// Use a verified sender rather than the customer's email
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: Neaten Website <' . $from . '>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . phpversion()
];

$sent = mail($to, $subject, $email_body, implode("\r\n", $headers));

echo $sent ? 'sent' : 'failed';
exit;
?>
