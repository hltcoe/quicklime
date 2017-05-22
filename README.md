Quicklime
=========

Quicklime is a web-based visualization and annotation tool for working
with [Concrete](https://github.com/hltcoe/concrete) objects.

Quicklime includes:

* JavaScript libraries for visualizing NLP data, including:
    * constituency parse trees
    * coreference
    * dependency parse graphs
    * Named Entity Recognition (NER) tags
    * Part Of Speech (POS) tags
* a small Python server that hosts the Quicklime HTML/CSS/JS files and
  handles Thrift RPC calls

concrete-js vs. Quicklime
-------------------------

The Quicklime project is a visualization and annotation tool that uses
[concrete-js](https://github.com/hltcoe/concrete-js).  **concrete-js**
is a lower-level library for manipulating Concrete data-structures.
The Quicklime repository includes a copy of the **concrete-js**
library - you do not need to checkout the **concrete-js** repository
in order to use Quicklime.

Installation
------------

You can install Quicklime from this repo using:

    python setup.py install

You can also install Quicklime using
[pip](http://www.pip-installer.org):

    pip install quicklime

Viewing Communications
-----------------------

To view a Concrete Communication, run the **qlook.py** script:

    qlook.py COMMUNICATION_FILENAME

then point your browser at [http://localhost:8080](http://localhost:8080)

To change the port ```qlook.py``` uses, use the long form ```--port PORT``` or
short form ```-p PORT``` flag.

Quicklime also supports viewing collections of Communications. ``COMMUNICATION_FILENAME`` can also be the path to a ``tar.gz`` archive, a ``zip`` archive,
or a directory of Communication files (with extension ``.comm`` or
``.concrete``.) In these cases, all Communications are loaded and you may then
select which Communication (by ``id``) to view within the browser.

This script reads in a Concrete Communication and starts a small
[Bottle.py](http://bottlepy.org/) webserver that shows an HTML
visualization of the Communication.
