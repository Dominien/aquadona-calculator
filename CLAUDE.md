# CLAUDE.md - Agent Guidelines for aquadona-calculator

## Project Overview
This is a JavaScript calculator for comparing water usage, costs, and environmental impact between seasonal and year-round water fountain operations.

## Default Values
- Water consumption: 300ml per use
- Water price: 2.13€ per m³
- Wastewater price: 2.41€ per m³
- Usage percentage slider: 0-100%

## Scripts & Commands
- No build system appears to be in place
- No linting configuration found
- No testing framework found
- To run: Load the HTML page in a browser

## Code Style Guidelines

### JS Formatting
- Use 2-space indentation
- Use semicolons at the end of statements
- Use const for variables that don't change, let otherwise

### Naming Conventions
- Use camelCase for variable and function names
- Constants use UPPERCASE_WITH_UNDERSCORES
- DOM IDs use kebab-case (e.g., 'menschen-gesamt')

### Number Formatting
- Use German locale (de-DE) for number formatting with toLocaleString
- Format money with 2 decimal places and '€' suffix

### Error Handling
- Use console.log/error for debugging
- Use console.warn for validation warnings
- Use alert() for user-facing errors

### DOM Manipulation
- Get elements by ID
- Use textContent to update text content
- Use CSS transitions for visual animations

## HTML Structure
- Built with Webflow
- Form with ID 'email-form' is the main container
- Uses Webflow-specific attributes (data-wf-*)
- Input fields use w-input class
- Range slider uses custom implementation with fs-rangeslider-* attributes
- Results display in a side-by-side comparison format (seasonal vs. year-round)
- Uses SVG icons for information tooltips