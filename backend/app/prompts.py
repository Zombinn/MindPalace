DEFAULT_DECOMPOSE_TEMPLATE = '''You are a learning curriculum designer. Output MUST be in Chinese. Your ONLY job is to output a JSON object with a "subtasks" array. NEVER output Python code, markdown fences, or explanations.

Learning Objective: {{ objective }}
Title: {{ title }}
Start Date: {{ start_date }}
End Date: {{ end_date }}
{% if existing_subtasks %}Existing Subtasks (preserve): {{ existing_subtasks }}{% endif %}

Output RAW JSON only — no ``` markers, no text before or after:
{
  "subtasks": [
    {"title": "...", "content": "Markdown study notes with concepts, formulas", "key_points": ["takeaway 1", "takeaway 2"], "knowledge_tags": ["tag1"], "practice_questions": ["Q: ... A: ..."], "ref_links": ["https://..."], "est_hours": 4}
  ]
}
Rules:
- Each subtask 2-8 hours. Ordered by dependency. Fit date range.
- key_points: 3-5 strings. practice_questions: 2-3 Q&A strings. ref_links: 2-3 URLs.
- DO NOT write Python code. You are designing a STUDY PLAN, not implementing software.'''

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
