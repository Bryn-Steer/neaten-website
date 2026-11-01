<?php
// Neaten Cleaning Enquiry Form
// Replace both email addresses with your real, configured addresses.

header('Content-Type: text/plain; charset=UTF-8');

$to = 'YOUR_INBOX@example.com';
$from = 'YOUR_VERIFIED_SENDER@example.com';
$subject = 'New Cleaning Enquiry | Neaten';

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

$name = str_replace(["\r", "\n"], ' ', getField('name'));
$email = getField('email');
$phone = getField('phone');
$service = getField('service');
$property_type = getField('property_type');
$postcode = getField('postcode');
$date = getField('date');
$time = getField('time');
$message = getField('message', 3000);

// Validate required information
if (
    $name === '' ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    $phone === '' ||
    $service === '' ||
    $property_type === '' ||
    $postcode === ''
) {
    echo 'failed';
    exit;
}

// Validate the selected service
$allowed_services = [
    'Regular Domestic Cleaning',
    'Deep Cleaning',
    'Move-In & Move-Out Cleaning',
    'Office Cleaning',
    'Communal Area Cleaning',
    'Scheduled Commercial Cleaning',
    'General Enquiry'
];

if (!in_array($service, $allowed_services, true)) {
    echo 'failed';
    exit;
}

// Validate property type
$allowed_properties = [
    'House',
    'Flat or Apartment',
    'Office',
    'Communal Area',
    'Commercial Property',
    'Other'
];

if (!in_array($property_type, $allowed_properties, true)) {
    echo 'failed';
    exit;
}

// Validate optional preferred date
if ($date !== '') {
    $parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    if (!$parsedDate || $parsedDate->format('Y-m-d') !== $date) {
        echo 'failed';
        exit;
    }
}

// Validate optional preferred time
if ($time !== '' && !in_array($time, ['Morning', 'Afternoon', 'Evening'], true)) {
    echo 'failed';
    exit;
}

// Prepare email content
$email_body = "NEW CLEANING ENQUIRY - NEATEN\n";
$email_body .= "========================================\n\n";

$email_body .= "CUSTOMER DETAILS\n";
$email_body .= "Name: " . $name . "\n";
$email_body .= "Email: " . $email . "\n";
$email_body .= "Phone: " . $phone . "\n\n";

$email_body .= "CLEANING REQUIREMENTS\n";
$email_body .= "Service: " . $service . "\n";
$email_body .= "Property Type: " . $property_type . "\n";
$email_body .= "Property Postcode: " . $postcode . "\n";
$email_body .= "Preferred Date: " . ($date ?: 'Not specified') . "\n";
$email_body .= "Preferred Time: " . ($time ?: 'No preference') . "\n\n";

$email_body .= "ADDITIONAL INFORMATION\n";
$email_body .= ($message ?: 'No additional information provided') . "\n\n";

$email_body .= "========================================\n";
$email_body .= "Submitted via the Neaten website.\n";
$email_body .= "This is an enquiry, not a confirmed booking.\n";

// Use a verified sender rather than the customer's email
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: Neaten Enquiries <' . $from . '>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . phpversion()
];

// Send email
$sent = mail(
    $to,
    $subject,
    $email_body,
    implode("\r\n", $headers)
);

// Return the response expected by the template's AJAX script
echo $sent ? 'sent' : 'failed';
exit;
?>
