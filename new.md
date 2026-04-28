# Semester Planner — Build Schedule Flow

## Overview
The user starts on the main dashboard after logging in. They land on the Course Tracker, where they can scroll to the MUBX AI Advisor section.

There are two actions in this section:
- Suggest Course
- Build Schedule

The Suggest Course feature is out of scope for this document.

This document defines the Build Schedule flow only.

## Build Schedule States

### 1. Not Ready State
If the user has not completed the semester setup, the Build Schedule button must appear in a warning/yellow state.

The button text should say:
- Build your schedule
- or Set up your semester

This state means the user still needs to complete the semester setup before schedule generation is available.

### 2. Ready State
If the user has completed the semester setup and added the required data, the Build Schedule button must appear enabled and emphasized.

The user can then click it to generate a schedule from the real data they entered.

## Entry Point
When the user clicks Build Schedule in the Not Ready State, they must be redirected to the semester setup page.

## Semester Setup Flow

### Step 1: Choose Semester Type
Ask the user to choose one:
- Fall
- Spring
- Summer

### Step 2: Apply Semester Preset Dates
Use the semester preset ranges below:
- Fall: October to February
- Spring: March to June
- Summer: July to September

### Step 3: Add Courses
After selecting the semester, guide the user to add courses.

The UI should include:
- A search bar for course lookup
- Search results below the input
- Tap or click to select a course

The user can add one or more courses until they are satisfied.

When finished, the user clicks the next button to continue.

### Step 4: Add Exams
After courses are added, ask the user whether they want to add exam information.

If yes, allow them to add:
- Midterms
- Finals

This data should be linked to specific courses when relevant.

### Step 5: Add Optional Course Details
After exam setup, let the user add optional details for each course.

### Step 6: Finish Setup
When all required and optional data has been added, the setup is complete.

At this point, the Build Schedule button becomes active.

## Build Schedule Rules
The Build Schedule action must only work after:
- A semester is selected
- At least one course is added
- The saved data is complete enough for generation

The AI must use only the actual user-entered data.

It must not invent:
- Courses
- Exams
- Dates
- Study tasks
- Semester details

## Display Locations
The generated schedule must appear in both places:
- Course Tracker view → Weekly Schedule section
- Planner Home page → Study Schedule section

Both views must use the same schedule source of truth.

## UI Requirements
Use lightweight UI patterns for basic actions:
- Popups
- Small modal dialogs
- A separate page only when necessary

The default loading state must use a skeleton loader, not a spinner.

## Mobile Requirements
The entire flow must be responsive and optimized for mobile.

It must:
- Work cleanly on small screens
- Stay readable
- Avoid unnecessary scrolling
- Keep actions easy to reach

## Anti-Hallucination Rules
The AI must only generate a schedule from stored real data.

If data is missing, incomplete, or invalid, the system must block generation and ask the user to finish setup instead of guessing.# Semester Planner — Build Schedule Flow

## Overview
The user starts on the main dashboard after logging in. They land on the Course Tracker, where they can scroll to the MUBX AI Advisor section.

There are two actions in this section:
- Suggest Course
- Build Schedule

The Suggest Course feature is out of scope for this document.

This document defines the Build Schedule flow only.

## Build Schedule States

### 1. Not Ready State
If the user has not completed the semester setup, the Build Schedule button must appear in a warning/yellow state.

The button text should say:
- Build your schedule
- or Set up your semester

This state means the user still needs to complete the semester setup before schedule generation is available.

### 2. Ready State
If the user has completed the semester setup and added the required data, the Build Schedule button must appear enabled and emphasized.

The user can then click it to generate a schedule from the real data they entered.

## Entry Point
When the user clicks Build Schedule in the Not Ready State, they must be redirected to the semester setup page.

## Semester Setup Flow

### Step 1: Choose Semester Type
Ask the user to choose one:
- Fall
- Spring
- Summer

### Step 2: Apply Semester Preset Dates
Use the semester preset ranges below:
- Fall: October to February
- Spring: March to June
- Summer: July to September

### Step 3: Add Courses
After selecting the semester, guide the user to add courses.

The UI should include:
- A search bar for course lookup
- Search results below the input
- Tap or click to select a course

The user can add one or more courses until they are satisfied.

When finished, the user clicks the next button to continue.

### Step 4: Add Exams
After courses are added, ask the user whether they want to add exam information.

If yes, allow them to add:
- Midterms
- Finals

This data should be linked to specific courses when relevant.

### Step 5: Add Optional Course Details
After exam setup, let the user add optional details for each course.

### Step 6: Finish Setup
When all required and optional data has been added, the setup is complete.

At this point, the Build Schedule button becomes active.

## Build Schedule Rules
The Build Schedule action must only work after:
- A semester is selected
- At least one course is added
- The saved data is complete enough for generation

The AI must use only the actual user-entered data.

It must not invent:
- Courses
- Exams
- Dates
- Study tasks
- Semester details

## Display Locations
The generated schedule must appear in both places:
- Course Tracker view → Weekly Schedule section
- Planner Home page → Study Schedule section

Both views must use the same schedule source of truth.

## UI Requirements
Use lightweight UI patterns for basic actions:
- Popups
- Small modal dialogs
- A separate page only when necessary

The default loading state must use a skeleton loader, not a spinner.

## Mobile Requirements
The entire flow must be responsive and optimized for mobile.

It must:
- Work cleanly on small screens
- Stay readable
- Avoid unnecessary scrolling
- Keep actions easy to reach

## Anti-Hallucination Rules
The AI must only generate a schedule from stored real data.

If data is missing, incomplete, or invalid, the system must block generation and ask the user to finish setup instead of guessing.