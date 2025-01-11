<?php
  // Replace with your email address
  $receiving_email_address = 'adeenamer0@gmail.com';

  // Check if the form was submitted
  if ($_SERVER["REQUEST_METHOD"] === "POST") {
      // Sanitize and validate input fields
      $name = htmlspecialchars($_POST['name']);
      $email = htmlspecialchars($_POST['email']);
      $subject = htmlspecialchars($_POST['subject']);
      $message = htmlspecialchars($_POST['message']);

      // Validate required fields
      if (empty($name) || empty($email) || empty($subject) || empty($message)) {
          die('Please fill out all required fields.');
      }

      // Validate email format
      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
          die('Invalid email address.');
      }

      // Email Headers
      $headers = "From: $name <$email>\r\n";
      $headers .= "Reply-To: $email\r\n";
      $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

      // Send Email
      $success = mail($receiving_email_address, $subject, $message, $headers);

      // Provide feedback to the user
      if ($success) {
          echo "Email sent successfully!";
      } else {
          echo "Error: Unable to send email.";
      }
  } else {
      die('Invalid request method.');
  }
?>
