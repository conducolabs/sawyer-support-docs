---
id: "1aade211-95d8-42cf-a15d-55c514bcbad2"
title: "Manage promotions"
synopsis: "How to create and manage promotions with QR code scanning."
language: en
---

# Manage promotions

Under **Communication > Promotions** you can manage promotions and vouchers as a super admin. This function is only available if it is activated for your account.

## Promotions list

The overview shows all promotions with:

- **Title** of the promotion
- **Description**
- **Validity period** (from/to)
- **Status**

## Create promotion

Click on **Add promotion**. You will be redirected to the form page.

### Basic data

- **Title** (mandatory field) - The name of the promotion.
- **Slug** (mandatory field) - Is automatically generated from the title (lower case, hyphens).
- **Description** (optional) - A description in the rich text editor.
- **Image** (optional) - An image for the promotion.

### Period and target group

- **Valid from** (mandatory field) - Start date and time.
- **Valid until** (mandatory field) - End date and time (must be after the start date).
- **Minimum age** (mandatory field) - Minimum age of the target group.
- **Maximum age** (mandatory field) - Maximum age of the target group.

### Redemption

- **Maximum redemptions per person** - How many times a person can redeem the promotion (default: 1).
- **Code source** - Choose between system-generated or CSV-imported codes. Cannot be changed after creation.

### Pass settings

- **Background color** - Select a background color via the color picker.
- **Foreground color** - Select a text color via the color picker.
- **Logo URL** (optional) - Link to a logo for the passport.

## Scan QR code

The **Scan** button on a promotion takes you to the scan page. This function is only available if sawyer has generated the codes. If codes were imported via CSV, this function is deactivated. Here you can:

- **Scan QR codes** - The camera is activated and scans QR codes automatically.
- **Enter code manually** - Enter a code by text input.
- **View scan history** - Under the scanner you can see the last scans with code, status and timestamp.

The system automatically checks whether the scanned code is valid, belongs to the right promotion and matches the right account.

## Edit promotion

Click on **Edit** to customize an existing promotion.

## Delete promotion

Click on **Delete** and confirm the action in the dialog.
