# Contributing to msgfmt

All packages are under the main repo.  To clone the dev environment:

**Currently all development is on the `v2` branch.**

```bash
$ git clone -b v2 https://github.com/gadicc/meteor-messageformat.git
$ cd meteor-messageformat
```

This directory now contains the repo base dir (README, etc), `msgfmt:core`, `msgfmt:ui`,
directories for those packages, and a `website` directory demonstrating basic functionality
(and also the source for messageformat.meteor.com).

If you intend to submit a **Pull Request** (see below), rather than cloning the base repo,
you should rather fork the repo to your own account and clone that instead (probably using
a `git:` URL scheme).

## Test Driven Development

*Only **Pull Requests with Tests** will be accepted*.

Make sure all tests are running during development:

```bash
git submodule init && git submodule update
cd website
meteor -p 3002 test-packages
```

and open a browser to http://localhost:3002/.

1. Identify the bug or planned feature
1. Add a test that fails without your change
1. Create your new code
1. Confirm that your test now passes

## Pull Request Requirements

We greatly appreciate help with this project but we have a few requirements
to ensure smooth development.

1. **Keep your PR as simple and concise as possible**.  *Do not mix multiple
**unrelated** features/fixes into a single PR.*  It is almost always
impossible for us to accept PRs that ignore this rule.  To submit multiple PRs,
simply use a different *branch* for each feature.  This is common practice
everywhere.  e.g. `git checkout -b faster-loads` (see also the GitHub
pull request doc linked below).

1. **All PRs should contain a test, that what would have failed before your
change and passes after (see above)**.  If there's no existing test that you
can copy, paste and modify to test for your work, and you don't feel
comfortable writing your own, it's ok, but then please state this when
submitting.

## Contributing your change (Pull Requests)

Please see https://help.github.com/articles/using-pull-requests/.

In brief:

```bash
$ git commit -a    # please use a clear commit message
$ git push
```

Go to the URL of your fork's repo and click "Merge Pull Request".
