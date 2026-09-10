const fs = require('fs');
const path = require('path');

const base = require('./.shell/pkg/vue.config')(__dirname);

/**
 * Every directory @rancher/shell resolves to. `.shell` and the node module are
 * both symlinks, and when shell is `yarn link`ed they point at a checkout
 * outside this repo - which is the path TypeScript reports diagnostics against.
 */
const shellDirs = () => {
  const candidates = [
    path.join(__dirname, '.shell'),
    path.join(__dirname, '..', '..', 'node_modules', '@rancher', 'shell'),
  ];

  return [...new Set(candidates.flatMap((dir) => {
    if (!fs.existsSync(dir)) {
      return [];
    }

    return [dir, fs.realpathSync(dir)];
  }))];
};

/**
 * Don't report type errors from inside @rancher/shell.
 *
 * ts-loader runs in transpileOnly mode, so this type check is advisory only -
 * but fork-ts-checker builds its program from our imports, which drags shell's
 * own sources in with it. Shell mixes .ts with plain .js and is type checked
 * against the dashboard repo's tsconfig, not ours, so those files report errors
 * that cannot be fixed from this repo and that shell will keep re-introducing
 * as it changes. It shows up most with a linked shell, where the checkout is
 * newer than the typings its published package shipped with.
 *
 * Errors in this extension's own code are still reported.
 */
const excludeShellTypeIssues = (chain) => {
  if (!chain.plugins.has('fork-ts-checker')) {
    return;
  }

  const dirs = shellDirs();

  chain.plugin('fork-ts-checker').tap(([options = {}]) => {
    const existing = options.issue?.exclude;
    const inherited = Array.isArray(existing) ? existing : existing ? [existing] : [];

    return [{
      ...options,
      issue: {
        ...options.issue,
        exclude: [
          ...inherited,
          (issue) => !!issue.file && dirs.some((dir) => issue.file.startsWith(`${ dir }${ path.sep }`)),
        ],
      },
    }];
  });
};

module.exports = {
  ...base,
  chainWebpack: (chain) => {
    base.chainWebpack?.(chain);
    excludeShellTypeIssues(chain);
  },
};
