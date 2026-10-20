#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Optimize fox_ prefix removal in Liquid snippets
Handles complex variable patterns that sed cannot reliably match
"""

import re
import os
import sys

def optimize_snippet(filepath):
    """Remove fox_ prefix from local variables while preserving context"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Pattern 1: {%- assign fox_xyz = ...
    content = re.sub(
        r'{%-\s*assign\s+fox_([a-z_]+)\s*=',
        r'{%- assign \1 =',
        content
    )

    # Pattern 2: {%- capture fox_xyz -%}
    content = re.sub(
        r'{%-\s*capture\s+fox_([a-z_]+)\s*-%}',
        r'{%- capture \1 -%}',
        content
    )

    # Pattern 3: {% for fox_xyz in ...
    content = re.sub(
        r'{%-\s*for\s+fox_([a-z_]+)\s+in\s+',
        r'{%- for \1 in ',
        content
    )

    # Pattern 4: {{ fox_xyz (output variable)
    # Be careful: only replace if not followed by specific patterns
    content = re.sub(
        r'\{\{\s*fox_([a-z_]+)(\s|\.|\||\})',
        r'{{ \1\2',
        content
    )

    # Pattern 5: fox_xyz. (property access)
    content = re.sub(
        r'\bfox_([a-z_]+)\.',
        r'\1.',
        content
    )

    # Pattern 6: if fox_xyz (condition