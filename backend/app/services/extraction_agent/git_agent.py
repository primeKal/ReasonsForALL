import logging
from typing import List, Dict, Any
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class GitAgent:
    """
    Ontological agent focused on augmenting already generated database concepts, 
    rules, and relationships by scanning git repositories for application-level 
    security decorators, middleware, or authorization logic.
    """

    def __init__(self, gemini_service=None):
        self.gemini_service = gemini_service

    def augment_ontology(
        self,
        repo_url: str | None,
        concepts: List[Dict[str, Any]],
        horizontal_rules: List[Dict[str, Any]],
        vertical_hierarchies: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Takes database concepts, horizontal rules, and vertical hierarchies, and augments them
        by analyzing the Git repository.
        """
        if not repo_url:
            logger.info("GitAgent: No repo_url provided. Skipping augmentation.")
            return horizontal_rules + vertical_hierarchies

        logger.info(f"GitAgent: Augmenting ontology from Git repository: {repo_url}")

        api_key = None
        if self.gemini_service:
            api_key = getattr(self.gemini_service, "api_key", None)

        if api_key:
            try:
                client = genai.Client(api_key=api_key)

                prompt = (
                    "You are an AI Git Logic Analyzer. You receive database concepts, vertical hierarchies, "
                    "and horizontal rules derived from database schema metadata. Your goal is to scan/analyze "
                    f"the codebase at repository URL: {repo_url} and augment these rules with application-level "
                    "authorization rules, security constraints, and decorator logic.\n\n"
                    f"Concepts:\n{concepts}\n\n"
                    f"Horizontal Rules:\n{horizontal_rules}\n\n"
                    f"Vertical Hierarchies:\n{vertical_hierarchies}\n\n"
                    "Return a JSON list of updated and augmented rules. Each rule should follow this schema:\n"
                    "- subject: class or concept name\n"
                    "- predicate: relationship/predicate name\n"
                    "- object: class or concept name\n"
                    "- type: 'ClassDefinition', 'ObjectProperty', or 'ClassHierarchy'\n"
                    "- quantifier: 'some', 'only', 'min', 'max', or 'none'\n"
                    "- cardinality_value: number or null\n"
                    "- description: detailed explanation of the augmented constraint"
                )

                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )

                import json
                augmented_rules = json.loads(response.text)
                if isinstance(augmented_rules, list):
                    logger.info(
                        f"GitAgent: Successfully augmented ontology with {len(augmented_rules)} rules from repo.")
                    return augmented_rules
            except Exception as e:
                logger.error(
                    f"GitAgent: Failed to augment via google-genai: {e}")

        # Local fallback: return combined rules unchanged
        return horizontal_rules + vertical_hierarchies
