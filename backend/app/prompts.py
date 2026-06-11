DEFAULT_DECOMPOSE_TEMPLATE = '''You are a learning curriculum designer. Break down the learning objective into a structured study plan with rich content.

Learning Objective: {{ objective }}
Title: {{ title }}
Start Date: {{ start_date }}
End Date: {{ end_date }}
{% if existing_subtasks %}Existing Subtasks (preserve mastered):
{{ existing_subtasks }}{% endif %}

For each subtask provide JSON with these fields:
- title: concise topic name
- content: detailed study notes in Markdown (key concepts, formulas, code snippets, explanations)
- key_points: 3-5 bullet points of the most important takeaways
- knowledge_tags: relevant topic tags (array)
- practice_questions: 2-3 self-test questions with answers (array of "Q: ... A: ...")
- ref_links: 2-3 recommended learning resources (URLs, array)
- est_hours: estimated hours

Each subtask should be a complete self-contained learning unit. Subtasks ordered by dependency. Each 2-8 hours. Total fits date range.
Return valid JSON only.'''

DEFAULT_EXAM_GEN_TEMPLATE = '''You are an exam designer for mastery-based learning.

Learning Objective: {{ objective }}
Topics: {{ subtasks }}
Allowed tags: {{ tags_list }}
{% if wrong_tags %}Weak areas: {{ wrong_tags }}{% endif %}
Questions: {{ question_count }}

Per question: qtype ("short_answer" or "code"), question, rubric, knowledge_tags (from allowed set), max_score (10-25).
Difficulty: large tech company interview. Mix conceptual and practical.
Rubric must be specific for AI grading. Return valid JSON only.'''

DEFAULT_EXAM_EVAL_TEMPLATE = '''You are a strict but fair exam grader.

Question: {{ question }}
Rubric: {{ rubric }}
Max Score: {{ max_score }}
Answer: {{ answer }}

Provide: score (0 to max_score), feedback (detailed, constructive).
Partial credit for understanding with minor errors. Return valid JSON only.'''

DEFAULT_REDECOMPOSE_TEMPLATE = '''You are a learning task designer. After a failed exam, create targeted subtasks.

Current Subtasks: {{ subtasks }}
Wrong Answers: {{ wrong_questions }}

Rules: DO NOT modify mastered/locked subtasks. Create reinforce subtasks for each weak area.
May add new subtasks for gaps. Each maps to a knowledge tag. Provide rationale.
Per subtask: title, content, knowledge_tags, est_hours. Return valid JSON only.'''

DEFAULT_SCRIPT_GEN_TEMPLATE = '''Generate a Python script for: {{ requirement }}

Use stdlib or common packages (requests, bs4, feedparser). Output to stdout or /workspace.
Handle errors. Include comments. Return ONLY Python code, no explanations.'''
