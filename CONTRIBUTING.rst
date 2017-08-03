Development
===========

Submitting a bug report
-----------------------

Please report any bugs to the GitLab (internal) or GitHub_ (public)
issue trackers.  Your issue will be resolved more quickly if you are
able to provide a `minimal working example`_, including an example
concrete data file if applicable.



For maintainers
---------------

Branches, versions, and releases
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The master branch is kept stable at all times.  Before a commit is
pushed to master, it should be checked by CI on another branch.  The
recommended way of maintaining this is to do all work in feature
branches that are kept up-to-date with master and pushed to GitLab,
waiting for CI to finish before merging.

We use zest.releaser_ to manage versions, the ``CHANGELOG``, and
releases.  (Making a new release is a many-step process that requires
great care; doing so by hand is strongly discouraged.)
Using zest.releaser, stable versions are released to PyPI
and master is kept on a development version number (so that a stable
version number never represents more than one snapshot of the code).
To make a new release install zest.releaser
(``pip install zest.releaser``) and run ``fullrelease``.



.. _`minimal working example`: https://en.wikipedia.org/wiki/Minimal_Working_Example
.. _GitHub: https://github.com/hltcoe/quicklime
.. _zest.releaser: http://zestreleaser.readthedocs.io/en/latest/overview.html
