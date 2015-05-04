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
cd website
meteor -p 3002 test-packages
```

and open a browser to http://localhost:3002/.

1. Identify the bug or planned feature
1. Add a test that fails without your change
1. Create your new code
1. Confirm that your test now passes

## Contributing your change (Pull Requests)

Please see https://help.github.com/articles/using-pull-requests/.

In brief:

```bash
$ git commit -a    # please use a clear commit message
$ git push
```

Go to the URL of your fork's repo and click "Merge Pull Request".
