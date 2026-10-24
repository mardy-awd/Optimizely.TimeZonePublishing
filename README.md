# Optimizely Time Zone Publishing

A lightweight add-on for **Optimizely CMS** that allows editors to schedule content publishing in different time zones without manually converting times.

## The Problem

By default, Optimizely CMS determines scheduled publishing times based on the editor's local time zone.

For example, an editor working in London who wants to publish content at:

- **8:00 AM New York time** must calculate the corresponding London time.
- **8:00 AM Tokyo time** must perform another time-zone conversion.

These manual calculations become more complicated when daylight saving time (DST) changes are involved.

## The Solution

**Optimizely Time Zone Publishing** adds a **Schedule Publish by Time Zone** action to the CMS Publish menu.

Editors can select their target time zone and enter the desired local publishing time. The add-on automatically converts it to UTC and uses Optimizely's existing scheduling functionality.

## Features

- Schedule publishing in a selected time zone.
- Search and select from supported time zones.
- Automatically convert the selected time to UTC.
- Display the equivalent time in the editor's local time zone.
- Validate DST transitions to prevent nonexistent or ambiguous times.
- Integrate with the existing CMS publishing workflow.

## Compatibility

- **Tested:** Optimizely CMS 13.4.0 with .NET 10.
- **Potential compatibility:** Earlier CMS versions, including CMS 12, may be supported with appropriate framework and package adjustments, but have not been tested.

The current NuGet package targets `net10.0` and depends on Optimizely CMS 13.4.0. It is not currently intended for direct installation into CMS 12 applications.

## Installation

Install the NuGet package:

```powershell
dotnet add package Mardy.Optimizely.TimeZonePublishing
```

The add-on registers its CMS module automatically. No additional configuration is required for the tested setup.

## Usage

1. Open a page in Optimizely CMS.
2. Open the **Publish** menu.
3. Select **Schedule Publish by Time Zone**.
4. Choose the target time zone.
5. Enter the desired publishing date and time.
6. Click **Schedule**.

The content will be scheduled using the corresponding UTC time.

## Daylight Saving Time

The add-on validates daylight saving time transitions and prevents scheduling at nonexistent or ambiguous local times.

For example, if the clocks move forward and a selected local time does not exist, the editor must choose another time.

## License

Licensed under the [MIT License](LICENSE).

## Author

Developed by [mardy-awd](https://github.com/mardy-awd).