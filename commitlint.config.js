// commitlint configuration for enforcing conventional commit messages
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'type-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', ['lower-case']],
    'subject-full-stop': [2, 'never', '.'],
  },
  prompt: {
    messages: {
      skip: 'press enter to skip',
      max: 'upper %d chars',
      min: '%d chars at least',
      emptyWarning: 'can not be empty',
      upperLimitWarning: 'exceed upper limit',
      lowerLimitWarning: 'below lower limit',
    },
    questions: {
      type: {
        description:
          "select the type of change that you're committing (feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert)",
      },
      scope: {
        description:
          'denote the SCOPE of this change (e.g., ui, renderer, main, analytics, build, ci). For multiple scopes use comma (ui,build) or leave empty.',
      },
      subject: {
        description:
          'write a short, imperative tense description of the change (lowercase, no period).',
      },
    },
  },
};
