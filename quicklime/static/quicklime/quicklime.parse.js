
/** Create and display a constituent parse diagram
 * @param {String} communicationUUID
 * @param {String} tokenizationUUID
 * @param {Number} constituentParseIndex
 */
QL.addConstituentParse = function(communicationUUID, tokenizationUUID, constituentParseIndex) {
  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  $("#constituent_parse_" + tokenizationUUID.uuidString).append(
    $('<div>')
      .attr("id", "constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex)
  );
  QL.drawConstituentParse(
    "#constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex,
    tokenization,
    constituentParseIndex);

  // Add title bar with width based on width of SVG canvas
  $("#constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex).prepend(
    // We add 2 to SVG width to compensate for border
    $('<div>')
      .addClass('parse_label constituent_parse_label')
      .html("CP" + constituentParseIndex + ": "+ tokenization.parseList[constituentParseIndex].metadata.tool)
      .width(2 + $("#constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex + " svg").width())
  );

  $('#constituent_parse_button_' + tokenizationUUID.uuidString + "_" + constituentParseIndex).addClass('active');
};


/** Create and display a dependency parse diagram
 * @param {String} communicationUUID
 * @param {String} tokenizationUUID
 * @param {Number} dependencyParseIndex
 */
QL.addDependencyParse = function(communicationUUID, tokenizationUUID, dependencyParseIndex) {
  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  $("#dependency_parse_" + tokenizationUUID.uuidString).append(
    $('<div>')
      .attr("id", "dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex)
  );
  QL.drawDependencyParse(
    "#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex,
    tokenization,
    dependencyParseIndex);

  // Add title bar with width based on width of SVG canvas
  $("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex).prepend(
    // We add 2 to SVG width to compensate for border
    $('<div>')
      .addClass('parse_label dependency_parse_label_' + dependencyParseIndex)
      .html("DP" + dependencyParseIndex + ": "+ tokenization.dependencyParseList[dependencyParseIndex].metadata.tool)
      .width(2 + $("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex + " svg").width())
  );

  $('#dependency_parse_button_' + tokenizationUUID.uuidString + "_" + dependencyParseIndex).addClass('active');
};




/** Add buttons for toggling display of parse trees
 *
 *  For each constituent and dependency parse in the Communication, add a button
 *  that toggles the display of the parse diagram.  The buttons are appended to
 *  the 'tokenization_controls' <div> for the respective Tokenization.
 *
 *  The '+' button indicates which objects are added to the DOM:
 *     <div class="tokenization_controls" id="tokenization_controls_[TOKENIZATION_UUID]">
 *   +   <button id="constituent_parse_button_[TOKENIZATION_UUID]_0>
 *   +   <button id="constituent_parse_button_[TOKENIZATION_UUID]_1>
 *   +   ...
 *   +   <button id="dependency_parse_button_[TOKENIZATION_UUID]_0>
 *   +   <button id="dependency_parse_button_[TOKENIZATION_UUID]_1>
 *   +   ...
 *
 * @param {Communication} comm
 */
QL.addTokenizationParseControls = function(comm) {
  /** Event handler for toggling constituent parse diagrams
   * @param {MouseEvent} event
   */
  function addOrToggleConstituentParse(event) {
    if (QL.domHasConstituentParse(event.data.tokenization_uuid, event.data.constituentParseIndex)) {
      QL.toggleConstituentParse(
        event.data.tokenization_uuid,
        event.data.constituentParseIndex
      );
    }
    else {
      QL.addConstituentParse(
        event.data.comm_uuid,
        event.data.tokenization_uuid,
        event.data.constituentParseIndex
      );
    }
  }

  /** Event handler for toggling dependency parse diagrams
   * @param {MouseEvent} event
   */
  function addOrToggleDependencyParse(event) {
    if (QL.domHasDependencyParse(event.data.tokenization_uuid, event.data.dependencyParseIndex)) {
      QL.toggleDependencyParse(
        event.data.tokenization_uuid,
        event.data.dependencyParseIndex
      );
    }
    else {
      QL.addDependencyParse(
        event.data.comm_uuid,
        event.data.tokenization_uuid,
        event.data.dependencyParseIndex
      );
    }
  }

  for (var sectionIndex in comm.sectionList) {
    if (comm.sectionList[sectionIndex].sentenceList) {
      for (var sentenceIndex in comm.sectionList[sectionIndex].sentenceList) {
        var sentence = comm.sectionList[sectionIndex].sentenceList[sentenceIndex];
        var tokenization = sentence.tokenization;

        var tokenization_controls_div = $('#tokenization_controls_' + tokenization.uuid.uuidString);

        if (tokenization.parseList) {
          for (var constituentParseIndex in tokenization.parseList) {
            var constituent_parse_button = $('<button>')
              .addClass('btn btn-default btn-xs')
              .attr('id', 'constituent_parse_button_' + tokenization.uuid.uuidString + "_" + constituentParseIndex)
              .attr('type', 'button')
              .click({comm_uuid: comm.uuid,
                      tokenization_uuid: tokenization.uuid,
                      constituentParseIndex: constituentParseIndex},
                     addOrToggleConstituentParse)
              .css('margin-right', '1em')
              .html("CP" + constituentParseIndex);
            tokenization_controls_div.append(constituent_parse_button);
          }
        }

	if (tokenization.dependencyParseList) {
          for (var dependencyParseIndex in tokenization.dependencyParseList) {
            var dependency_parse_button = $('<button>')
              .addClass('btn btn-default btn-xs')
              .attr('id', 'dependency_parse_button_' + tokenization.uuid.uuidString + "_" + dependencyParseIndex)
              .attr('type', 'button')
              .click({comm_uuid: comm.uuid,
                      tokenization_uuid: tokenization.uuid,
                      dependencyParseIndex: dependencyParseIndex},
                     addOrToggleDependencyParse)
              .css('margin-right', '1em')
              .html("DP" + dependencyParseIndex);
            tokenization_controls_div.append(dependency_parse_button);
          }
        }
      }
    }
  }
};


/** Draw constituent parse diagram
 * @param {String} containerSelectorString
 * @param {Tokenization} tokenization
 */
QL.drawConstituentParse = function(containerSelectorString, tokenization, constituentParseIndex) {
  var
    constituent,
    constituentIndex,
    g = new dagreD3.Digraph();

  var constituentParse = tokenization.parseList[constituentParseIndex];

  for (constituentIndex in constituentParse.constituentList) {
    constituent = constituentParse.constituentList[constituentIndex];
    if (constituent.childList.length === 0) {
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: "type-TOKEN" });
    }
    else {
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: "type-foo"});
    }
  }

  for (constituentIndex in constituentParse.constituentList) {
    constituent = constituentParse.constituentList[constituentIndex];
    if (constituent.childList.length > 0) {
      for (var childIndex in constituent.childList) {
        g.addEdge(null, constituent.id, constituent.childList[childIndex]);
      }
    }
  }

  QL.drawParse(containerSelectorString, g, 10);
};


/** Draw dependency parse diagram
 * @param {String} containerSelectorString
 * @param {Tokenization} tokenization
 * @param {Number} dependencyParseIndex
 */
QL.drawDependencyParse = function(containerSelectorString, tokenization, dependencyParseIndex) {
  var g = new dagreD3.Digraph();
  var dependency, i;

  var dependencyParse = tokenization.dependencyParseList[dependencyParseIndex];

  var nodeSet = {};

  // Some tokens - such as punctuation marks - will not have nodes in the dependency parse
  for (i = 0; i < dependencyParse.dependencyList.length; i++) {
    dependency = dependencyParse.dependencyList[i];
    nodeSet[dependency.dep] = true;
    if (dependency.gov) {
      nodeSet[dependency.gov] = true;
    }
  }

  for (i = 0; i < tokenization.tokenList.tokenList.length; i++) {
    token = tokenization.tokenList.tokenList[i];
    if (token.tokenIndex in nodeSet) {
      g.addNode(token.tokenIndex, { label: token.text, nodeclass: "type-UNKNOWN" });
    }
  }

  for (i = 0; i < dependencyParse.dependencyList.length; i++) {
    dependency = dependencyParse.dependencyList[i];
    // The root edge will not have a 'gov'
    if (typeof(dependency.gov) != 'undefined' && dependency.gov !== null) {
      g.addEdge(null, dependency.gov, dependency.dep, { label: dependency.edgeType });
    }
  }

  QL.drawParse(containerSelectorString, g);
};


/** Draw parse diagram
 * @param {String} containerSelectorString
 * @param {dagre3.Digraph} digraph
 * @param {Number} [nodeSep=20] - Distance between nodes, in pixels
 */
QL.drawParse = function(containerSelectorString, digraph, nodeSep) {
  // Code adapted from dagre-d3 demo code:
  //   http://cpettitt.github.io/project/dagre-d3/latest/demo/sentence-tokenization.html

  // Node separation defaults to 20px
  nodeSep = nodeSep || 20;

  var renderer = new dagreD3.Renderer();
  var oldDrawNodes = renderer.drawNodes();
  renderer.drawNodes(function(graph, root) {
    var svgNodes = oldDrawNodes(graph, root);
    svgNodes.each(function(u) {
      d3.select(this).classed(graph.node(u).nodeclass, true);
    });
    return svgNodes;
  });
  d3.select(containerSelectorString)
    .append("svg").attr("height", 800).attr("width", 600).attr("style", "background-color: white;")
    .append("g").attr("transform", "translate(20, 20)");
  var layout = dagreD3.layout().nodeSep(nodeSep);
  layout = renderer.layout(layout).run(digraph, d3.select(containerSelectorString).select("svg").select("g"));
  d3.select(containerSelectorString).select("svg")
    .attr("width", layout.graph().width + 40)
    .attr("height", layout.graph().height + 40);
};


/** Check if constituent parse diagram has already been added to DOM
 * @param {String} tokenizationUUID
 * @param {Number} constituentParseIndex
 * @returns {Boolean}
 */
QL.domHasConstituentParse = function(tokenizationUUID, constituentParseIndex) {
  if ($("#constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Check if dependency parse diagram has already been added to DOM
 * @param {String} tokenizationUUID
 * @param {Number} dependencyParseIndex
 * @returns {Boolean}
 */
QL.domHasDependencyParse = function(tokenizationUUID, dependencyParseIndex) {
  if ($("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Toggle display of constituent parse diagram
 * @param {String} tokenizationUUID
 * @param {Number} constituentParseIndex
 * @returns {Boolean}
 */
QL.toggleConstituentParse = function(tokenizationUUID, constituentParseIndex) {
  if ($("#constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex).css('display') == 'none') {
    $('#constituent_parse_button_' + tokenizationUUID.uuidString + "_" + constituentParseIndex).addClass('active');
    $("#constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex).show();
  }
  else {
    $('#constituent_parse_button_' + tokenizationUUID.uuidString + "_" + constituentParseIndex).removeClass('active');
    $("#constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex).hide();
  }
};


/** Toggle display of dependency parse diagram
 * @param {String} tokenizationUUID
 * @param {Number} dependencyParseIndex
 */
QL.toggleDependencyParse = function(tokenizationUUID, dependencyParseIndex) {
  if ($("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex).css('display') == 'none') {
    $('#dependency_parse_button_' + tokenizationUUID.uuidString + "_" + dependencyParseIndex).addClass('active');
    $("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex).show();
  }
  else {
    $('#dependency_parse_button_' + tokenizationUUID.uuidString + "_" + dependencyParseIndex).removeClass('active');
    $("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex).hide();
  }
};
