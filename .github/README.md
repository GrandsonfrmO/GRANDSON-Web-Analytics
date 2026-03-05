# GitHub Configuration

Ce dossier contient la configuration GitHub pour le projet Web Analyzer Pro.

## Fichiers

### Workflows
- **ci.yml** : Pipeline d'intégration continue (tests, linting, build)

### Issue Templates
- **bug_report.md** : Template pour signaler des bugs
- **feature_request.md** : Template pour suggérer des features

### Pull Request
- **PULL_REQUEST_TEMPLATE.md** : Template pour les pull requests

## Configuration Recommandée

### Branch Protection Rules

Pour la branche `main` :
1. Require pull request reviews before merging (1 approval)
2. Require status checks to pass before merging
3. Require branches to be up to date before merging
4. Require code reviews from code owners

### Secrets à Configurer

Dans les paramètres du repository, ajoutez :
- `GEMINI_API_KEY` : Votre clé API Gemini
- `CODECOV_TOKEN` : Token Codecov (optionnel)

### Actions à Activer

- GitHub Actions doit être activé
- Les workflows doivent être autorisés à s'exécuter

## Utilisation

Les workflows s'exécutent automatiquement sur :
- Push vers `main` ou `develop`
- Pull requests vers `main` ou `develop`

Consultez les logs dans l'onglet "Actions" du repository.
