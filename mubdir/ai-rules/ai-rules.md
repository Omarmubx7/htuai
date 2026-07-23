# AI Rules for Mubdir

## Principle
Mubdir is not an AI product in v1. Do not add AI behavior unless the product owner explicitly requests it.

## Allowed AI Usage
AI can only be introduced later for optional helper tasks such as:
- summarizing course resources
- extracting metadata from uploaded documents
- answering questions about a specific course archive

## Disallowed AI Usage in v1
- automatic ranking based on generated intelligence
- chat assistants on every page
- hidden recommendation engines
- content generation that changes the resource meaning
- replacing user-selected course labels with AI guesses

## Product Rule
If a student uploads a resource, the course label must come from the user or from the selected course dropdown. AI must not auto-assign the course in the first version.

## Safety Rule
Never generate or rewrite academic content in a way that could misrepresent source material. The system should store and present resources, not fabricate them.

## Cost Rule
Prefer no-AI flows whenever a deterministic UI or database operation can solve the task.
