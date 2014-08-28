QuickLime
=========

QuickLime is a web-based visualization and annotation tool for working
with [Concrete](https://gitlab.hltcoe.jhu.edu/concrete/concrete)
objects.

QuickLime includes:

* JavaScript libraries for visualizing NLP data, including:
    * constituency parse trees
    * coreference
    * dependency parse graphs
    * Named Entity Recognition (NER) tags
    * Part Of Speech (POS) tags
* a small Python server that hosts the QuickLime HTML/CSS/JS files and
  handles Thrift RPC calls

concrete-js vs. QuickLime
-------------------------

The QuickLime project is a visualization and annotation tool that uses
the [concrete-js](https://gitlab.hltcoe.jhu.edu/concrete/quicklime).
**concrete-js** is a low-level library for manipulating Concrete
data-structures that does not touch the DOM.  The QuickLime repository
includes a copy of the **concrete-js** library - you do not need to
checkout the **concrete-js** repository in order to use QuickLime.

Installation
------------

Install the Python webserver dependencies using
[pip](http://www.pip-installer.org):

    pip install bottle
    pip install git+https://github.com/charman/concrete-python.git#egg=concrete

Viewing a Communication
-----------------------

To view a Concrete Communication, run the **qlook.py** script:

    python qlook.py CONCRETE_FILENAME

then point your browser at [http://localhost:8080](http://localhost:8080)

To change the port ```qlook.py``` uses, use the long form ```--port PORT``` or
short form ```-p PORT``` flag.

This script reads in a Concrete Communication and starts a small
[Bottle.py](http://bottlepy.org/) webserver that shows an HTML
visualization of the Communication.
