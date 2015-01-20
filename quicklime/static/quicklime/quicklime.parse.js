QL.parse = {};

/** Create and display a constituent parse diagram
 * @param {concrete.UUID} communicationUUID
 * @param {concrete.UUID} tokenizationUUID
 * @param {Number} constituentParseIndex
 */
QL.parse.addConstituentParse = function(communicationUUID, tokenizationUUID, constituentParseIndex) {
  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  $("#constituent_parse_" + tokenizationUUID.uuidString).append(
    $('<div>')
      .attr("id", "constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex)
  );
  QL.parse.drawConstituentParse(
    comm,
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
 * @param {concrete.UUID} communicationUUID
 * @param {concrete.UUID} tokenizationUUID
 * @param {Number} dependencyParseIndex
 */
QL.parse.addDependencyParse = function(communicationUUID, tokenizationUUID, dependencyParseIndex) {
  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  $("#dependency_parse_" + tokenizationUUID.uuidString).append(
    $('<div>')
      .attr("id", "dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex)
  );
  QL.parse.drawDependencyParse(
    comm,
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
 * @param {concrete.Communication} comm
 */
QL.parse.addTokenizationParseControls = function(comm) {
  /** Event handler for toggling constituent parse diagrams
   * @param {MouseEvent} event
   */
  function addOrToggleConstituentParse(event) {
    if (QL.parse.domHasConstituentParse(event.data.tokenization_uuid, event.data.constituentParseIndex)) {
      QL.parse.toggleConstituentParse(
        event.data.tokenization_uuid,
        event.data.constituentParseIndex
      );
    }
    else {
      QL.parse.addConstituentParse(
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
    if (QL.parse.domHasDependencyParse(event.data.tokenization_uuid, event.data.dependencyParseIndex)) {
      QL.parse.toggleDependencyParse(
        event.data.tokenization_uuid,
        event.data.dependencyParseIndex
      );
    }
    else {
      QL.parse.addDependencyParse(
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
            QL.addMetadataTooltip(constituent_parse_button, tokenization.parseList[constituentParseIndex].metadata);
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
            QL.addMetadataTooltip(dependency_parse_button, tokenization.dependencyParseList[dependencyParseIndex].metadata);
            tokenization_controls_div.append(dependency_parse_button);
          }
        }
      }
    }
  }
};


/** Draw constituent parse diagram
 * @parma {concrete.Communication} comm
 * @param {String} containerSelectorString
 * @param {concrete.Tokenization} tokenization
 * @param {Number} constituentParseIndex
 */
QL.parse.drawConstituentParse = function(comm, containerSelectorString, tokenization, constituentParseIndex) {
  var
    constituent,
    constituentIndex,
    g = new dagreD3.Digraph();

  var constituentParse = tokenization.parseList[constituentParseIndex];

  var classNamesForTokens = QL.parse.getCSSClassesForTokenization(comm, tokenization);

  for (constituentIndex in constituentParse.constituentList) {
    constituent = constituentParse.constituentList[constituentIndex];
    if (constituent.childList.length === 0) {
      var classNames = "type-TOKEN ";
      if (constituent.start !== null && constituent.ending !== null) {
        for (var i = constituent.start; i < constituent.ending; i++) {
          classNames += classNamesForTokens[i].join(" ") + " ";
        }
      }
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: classNames });
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

  QL.parse.drawParse(containerSelectorString, g, 10);
};


/** Draw dependency parse diagram
 * @param {concrete.Communication} comm
 * @param {String} containerSelectorString
 * @param {concrete.Tokenization} tokenization
 * @param {Number} dependencyParseIndex
 */
QL.parse.drawDependencyParse = function(comm, containerSelectorString, tokenization, dependencyParseIndex) {
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

  var classNamesForTokens = QL.parse.getCSSClassesForTokenization(comm, tokenization);

  for (i = 0; i < tokenization.tokenList.tokenList.length; i++) {
    token = tokenization.tokenList.tokenList[i];
    if (token.tokenIndex in nodeSet) {
      g.addNode(token.tokenIndex, {
        label: token.text,
        nodeclass: classNamesForTokens[token.tokenIndex].join(' ')
      });
    }
  }

  for (i = 0; i < dependencyParse.dependencyList.length; i++) {
    dependency = dependencyParse.dependencyList[i];
    // The root edge will not have a 'gov'
    if (typeof(dependency.gov) != 'undefined' && dependency.gov !== null && dependency.gov !== -1) {
      if (dependency.edgeType) {
        g.addEdge(null, dependency.gov, dependency.dep, { label: dependency.edgeType });
      }
      else {
        g.addEdge(null, dependency.gov, dependency.dep);
      }
    }
  }

  QL.parse.drawParse(containerSelectorString, g);
};


/** Draw parse diagram
 * @param {String} containerSelectorString
 * @param {dagre3.Digraph} digraph
 * @param {Number} [nodeSep=20] - Distance between nodes, in pixels
 */
QL.parse.drawParse = function(containerSelectorString, digraph, nodeSep) {
  // Code adapted from dagre-d3 demo code:
  //   http://cpettitt.github.io/project/dagre-d3/latest/demo/sentence-tokenization.html

  // Node separation defaults to 20px
  nodeSep = nodeSep || 20;

  var renderer = new dagreD3.Renderer();
  var oldDrawNodes = renderer.drawNodes();
  renderer.zoom(false);
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
 * @param {concrete.UUID} tokenizationUUID
 * @param {Number} constituentParseIndex
 * @returns {Boolean}
 */
QL.parse.domHasConstituentParse = function(tokenizationUUID, constituentParseIndex) {
  if ($("#constituent_parse_" + tokenizationUUID.uuidString + "_" + constituentParseIndex + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Check if dependency parse diagram has already been added to DOM
 * @param {concrete.UUID} tokenizationUUID
 * @param {Number} dependencyParseIndex
 * @returns {Boolean}
 */
QL.parse.domHasDependencyParse = function(tokenizationUUID, dependencyParseIndex) {
  if ($("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Get an array of Entity, EntityMention & SituationMention CSS classes for each token in a tokenization
 * @param {concrete.Communication} comm
 * @param {concrete.Tokenization} tokenization
 * @returns {Array} - An array with the same length as the number of tokens in the tokenization,
 *                    where each element is an array of CSS classnames for the corresponding token.
 */
QL.parse.getCSSClassesForTokenization = function(comm, tokenization) {
  var totalTokens = tokenization.tokenList.tokenList.length;
  var classNames = Array(totalTokens);
  var entityMention;
  var i, j, l;

  for (i = 0; i < totalTokens; i++) {
    classNames[i] = Array();
  }

  // Add DOM classes for EntityMentions
  if (comm.entityMentionSetList) {
    for (var entityMentionSetIndex in comm.entityMentionSetList) {
      if (comm.entityMentionSetList[entityMentionSetIndex].mentionList) {
        for (var mentionListIndex in comm.entityMentionSetList[entityMentionSetIndex].mentionList) {
          entityMention = comm.entityMentionSetList[entityMentionSetIndex].mentionList[mentionListIndex];
          if (entityMention.tokens.tokenizationId.uuidString === tokenization.uuid.uuidString) {
            for (i = 0, l = entityMention.tokens.tokenIndexList.length; i < l; i++) {
              classNames[entityMention.tokens.tokenIndexList[i]].push(
                'entity_mention_' + entityMention.uuid.uuidString
              );
              classNames[entityMention.tokens.tokenIndexList[i]].push(
                'entity_mention_set_' + comm.entityMentionSetList[entityMentionSetIndex].uuid.uuidString
              );
            }
          }
        }
      }
    }
  }

  // Add DOM classes for Entities
  if (comm.entitySetList) {
    for (var entitySetListIndex in comm.entitySetList) {
      for (var entityListIndex in comm.entitySetList[entitySetListIndex].entityList) {
        var entity = comm.entitySetList[entitySetListIndex].entityList[entityListIndex];
        for (i = 0; i < entity.mentionIdList.length; i++) {
          entityMention = comm.getEntityMentionWithUUID(entity.mentionIdList[i]);
          if (entityMention.tokens.tokenizationId.uuidString === tokenization.uuid.uuidString) {
            for (j = 0, l = entityMention.tokens.tokenIndexList.length; j < l; j++) {
              classNames[entityMention.tokens.tokenIndexList[j]].push(
                'entity_' + entity.uuid.uuidString
              );
              classNames[entityMention.tokens.tokenIndexList[j]].push(
                'entity_set_' + comm.entitySetList[entitySetListIndex].uuid.uuidString
              );
            }
          }
        }
      }
    }
  }

  // Add DOM classes for SituationMentions
  if (comm.situationMentionSetList) {
    for (var situationMentionSetIndex in comm.situationMentionSetList) {
      var situationMentionList = comm.situationMentionSetList[situationMentionSetIndex].mentionList;
      if (situationMentionList) {
        for (var situationMentionListIndex in situationMentionList) {
          var situationMention = situationMentionList[situationMentionListIndex];
          if (situationMention.tokens &&
              situationMention.tokens.tokenizationId.uuidString === tokenization.uuid.uuidString)
          {
            for (i = 0, l = situationMention.tokens.tokenIndexList.length; i < l; i++) {
              classNames[situationMention.tokens.tokenIndexList[i]].push(
                'situation_mention_' + situationMention.uuid.uuidString
              );
            }
          }
        }
      }
    }
  }

  return classNames;
};


/** Toggle display of constituent parse diagram
 * @param {concrete.UUID} tokenizationUUID
 * @param {Number} constituentParseIndex
 * @returns {Boolean}
 */
QL.parse.toggleConstituentParse = function(tokenizationUUID, constituentParseIndex) {
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
 * @param {concrete.UUID} tokenizationUUID
 * @param {Number} dependencyParseIndex
 */
QL.parse.toggleDependencyParse = function(tokenizationUUID, dependencyParseIndex) {
  if ($("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex).css('display') == 'none') {
    $('#dependency_parse_button_' + tokenizationUUID.uuidString + "_" + dependencyParseIndex).addClass('active');
    $("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex).show();
  }
  else {
    $('#dependency_parse_button_' + tokenizationUUID.uuidString + "_" + dependencyParseIndex).removeClass('active');
    $("#dependency_parse_" + tokenizationUUID.uuidString + "_" + dependencyParseIndex).hide();
  }
};
