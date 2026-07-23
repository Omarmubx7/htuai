# Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This document defines the requirements for **MubxAI Directory (mubdir)**, a simple course-based resource directory for HTU students. The system lets students search a course name and view all resources attached to that course, including files, links, videos, folders, and images.

### 1.2 Scope
The product is a lightweight academic resource directory. It is not an AI product, not a recommendation engine, and not a complex taxonomy system. Its core goal is to keep the cost near zero while making course materials easy to find and contribute.

### 1.3 Product Vision
Students should be able to:
- search for a course by name or code
- browse all resources attached to that course
- upload or submit a new resource with a course label
- open any resource type from one unified interface

### 1.4 Definitions
- **Course**: A university subject such as Advanced Programming.
- **Resource**: Any linked or uploaded item connected to a course.
- **Directory**: A browseable list of course-linked resources.

## 2. Overall Description

### 2.1 User Needs
Students need a fast way to locate syllabi, assignment briefs, videos, links, folders, and notes for their courses without asking around manually every time.

### 2.2 Product Constraints
- Must stay simple and low cost.
- Must support HTU first.
- Must work on mobile.
- Must not depend on AI.

### 2.3 Assumptions
- Courses already exist in the MubxAI codebase or seed data.
- Users may contribute resource links or uploaded files.
- Some external links may be hosted on third-party platforms.

## 3. System Features

### 3.1 Course Search
Users can search courses by name or code. Search must return matching courses only and show associated resources.

### 3.2 Resource Browsing
Each course page shows all attached resources in a single list. No extra categorization layers are required.

### 3.3 Resource Submission
Users can submit a resource by selecting a course and adding:
- title
- resource type
- URL or file reference
- optional description
- optional semester tag

### 3.4 Supported Resource Types
- PDF
- video link
- general URL
- image
- folder link
- other file

### 3.5 Reporting and Moderation
Users can flag broken, irrelevant, or unsafe resources. Moderation is manual at the beginning.

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | The system shall allow users to search courses by name or code. |
| FR-2 | The system shall display all resources attached to a selected course. |
| FR-3 | The system shall allow users to submit a resource with a course label. |
| FR-4 | The system shall support files and external URLs. |
| FR-5 | The system shall allow filtering by resource type. |
| FR-6 | The system shall allow users to report invalid resources. |
| FR-7 | The system shall support mobile and desktop layouts. |
| FR-8 | The system shall keep the initial deployment cost near zero. |

## 5. Non-Functional Requirements

### 5.1 Performance
- Search results should appear quickly.
- The interface should remain responsive on mobile devices.

### 5.2 Usability
- The interface must be simple enough for first-time users.
- The upload flow should be short and clear.

### 5.3 Accessibility
- All controls must be keyboard accessible.
- Forms must have labels.
- Contrast must be readable in light and dark mode.

### 5.4 Maintainability
- Course data must be easy to seed and update.
- Resource types should be extensible without reworking the whole schema.

### 5.5 Cost
- The system should use free or near-free hosting and storage during early growth.

## 6. Data Requirements

### 6.1 Entities
- **Course**: id, name, code, department, created_at
- **Resource**: id, course_id, title, type, url, description, uploaded_by, created_at
- **Report**: id, resource_id, reason, created_by, created_at

### 6.2 Relationships
- One course can have many resources.
- One resource belongs to one course.
- One resource can have many reports.

## 7. User Flows

### 7.1 Browse Flow
1. User opens the directory.
2. User searches for a course.
3. User selects the course.
4. User sees all attached resources.
5. User opens any resource directly.

### 7.2 Upload Flow
1. User clicks Upload.
2. User selects a course.
3. User chooses a resource type.
4. User adds title and URL or uploads file.
5. User submits the resource.

## 8. Acceptance Criteria
- A user can find a course in fewer than three actions.
- A user can open a linked resource from the course page.
- A user can submit a new resource without using AI or extra categorization.
- The UI remains usable on mobile.

## 9. Out of Scope
- AI chat over resources
- automatic summarization
- plagiarism detection
- advanced recommendation ranking
- OCR or document parsing in v1
