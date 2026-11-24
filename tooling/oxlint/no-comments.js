const directive =
  /^\s*(@ts-(expect-error|ignore|nocheck|check)\b|(eslint|oxlint)-(disable|enable)|oxfmt-ignore|prettier-ignore|@vitest-environment|[#@]__PURE__|\/\s*<reference\s)/;

const noComments = {
  meta: {
    type: "problem",
    docs: { description: "Disallow comments other than tool directives" },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!directive.test(comment.value)) {
            context.report({
              loc: comment.loc,
              message:
                "Comments are not allowed. Explain with names, and record the why in an ADR.",
            });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "local" },
  rules: { "no-comments": noComments },
};
