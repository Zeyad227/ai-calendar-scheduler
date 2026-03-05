# AI Calendar Scheduler

## Overview
AI Calendar Scheduler is a small Python project that experiments with converting natural language scheduling requests into structured calendar events.

Instead of manually filling out a calendar form, the user can type something like:

"schedule a meeting with Sarah tomorrow at 2pm"

The program processes the text and extracts information such as the event title, date, and time.

This project was mainly built to explore how natural language input can be converted into structured data using AI.

---

## Why I Built This
I built this project because I was curious about how natural language processing works in real applications.

Scheduling events is something people do every day, and it seemed like a practical example of how AI could automate a repetitive task.

The goal of the project was to experiment with parsing user input and converting it into a format that could eventually be used with a calendar system.

---

## Features
- Accepts natural language scheduling input
- Extracts event details like date and time
- Formats the result as structured event data
- Simple command line interaction

Example input:

Schedule a meeting with Zeyad tomorrow at 4pm

Example output:

Event: Meeting with Zeyad  
Date: Tomorrow  
Time: 4pm

---

## Tech Stack
- Python
- Groq API
- JSON data handling

---

## How It Works
1. The user enters a natural language scheduling request.
2. The input is sent to an AI model.
3. The model analyzes the text and extracts key information.
4. The program formats the extracted data into a structured event object.

The output could later be connected to a real calendar API.

---

## Installation

Clone the repository:

git clone https://github.com/Zeyad227/ai-calendar-scheduler  
cd ai-calendar-scheduler

Install dependencies:

pip install -r requirements.txt

Run the program:

python main.py

---

## Challenges
One challenge was handling different ways users might phrase the same request.

For example:

- "tomorrow at 3"
- "3pm tomorrow"
- "meeting tomorrow afternoon"

Natural language can be inconsistent, so parsing the input reliably required testing different prompt formats and adjusting how the data was extracted.

---

## Future Improvements
Possible improvements include:

- integrating with Google Calendar API
- better time and date parsing
- handling recurring events
- adding a simple web interface

---

