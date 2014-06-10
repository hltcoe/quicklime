
QL.addConstituentParse = function(communicationUUID, sentenceUUID, tokenizationUUID) {
  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);
  QL.drawConstituentParse("#constituent_parse_" + sentenceUUID, tokenization);
  $("#constituent_parse_" + sentenceUUID).prepend(
    // We add 2 to SVG width to compensate for border
    $('<div>')
      .addClass('parse_label')
      .html("CP")
      .width(2 + $("#constituent_parse_" + sentenceUUID + " svg").width())
  );

  $('#constituent_parse_button_' + sentenceUUID).addClass('active');
};


QL.addDependencyParse = function(communicationUUID, sentenceUUID, tokenizationUUID, dependencyParseIndex) {
  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  $("#dependency_parse_" + sentenceUUID).append(
    $('<div>')
      .attr("id", "dependency_parse_" + sentenceUUID + "_" + dependencyParseIndex)
  );
  QL.drawDependencyParse(
    "#dependency_parse_" + sentenceUUID + "_" + dependencyParseIndex,
    tokenization,
    dependencyParseIndex);

  // Add title bar with width based on width of SVG canvas
  $("#dependency_parse_" + sentenceUUID + "_" + dependencyParseIndex).prepend(
    // We add 2 to SVG width to compensate for border
    $('<div>')
      .addClass('parse_label')
      .html("DP" + dependencyParseIndex)
      .width(2 + $("#dependency_parse_" + sentenceUUID + "_" + dependencyParseIndex + " svg").width())
  );

  $('#dependency_parse_button_' + sentenceUUID + "_" + dependencyParseIndex).addClass('active');
};




/*
Add buttons to sentence_control <div>'s:

    <div class="sentence_controls" id="sentence_controls_[SENTENCE_UUID]">
+     <button>
+     <button>
+     ...
 */
QL.addSentenceParseControls = function(comm) {
  function addOrToggleConstituentParse(event) {
    if (QL.domHasConstituentParse(event.data.sentence_uuid)) {
      QL.toggleConstituentParse(event.data.sentence_uuid);
    }
    else {
      QL.addConstituentParse(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
    }
  }

  function addOrToggleDependencyParse(event) {
    if (QL.domHasDependencyParse(event.data.sentence_uuid, event.data.dependencyParseIndex)) {
      QL.toggleDependencyParse(
        event.data.sentence_uuid,
        event.data.dependencyParseIndex
      );
    }
    else {
      QL.addDependencyParse(
        event.data.comm_uuid,
        event.data.sentence_uuid,
        event.data.tokenization_uuid,
        event.data.dependencyParseIndex
      );
    }
  }

  for (var sectionListIndex in comm.sectionSegmentations[0].sectionList) {
    if (comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation) {
      for (var sentenceIndex in comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList) {
        var sentence = comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList[sentenceIndex];
        var tokenization = sentence.tokenizationList[0];

        var sentence_controls_div = $('#sentence_controls_' + sentence.uuid);

        if (tokenization.parse) {
          var constituent_parse_button = $('<button>')
            .addClass('btn btn-default btn-xs')
            .attr('id', 'constituent_parse_button_' + sentence.uuid)
            .attr('type', 'button')
            .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid},
                   addOrToggleConstituentParse)
            .css('margin-right', '1em')
            .html("CP");
          sentence_controls_div.append(constituent_parse_button);
        }

	if (tokenization.dependencyParseList) {
          for (var dependencyParseIndex in tokenization.dependencyParseList) {
            var dependency_parse_button = $('<button>')
              .addClass('btn btn-default btn-xs')
              .attr('id', 'dependency_parse_button_' + sentence.uuid)
              .attr('type', 'button')
              .click({comm_uuid: comm.uuid,
                      sentence_uuid: sentence.uuid,
                      tokenization_uuid: tokenization.uuid,
                       dependencyParseIndex: dependencyParseIndex},
                     addOrToggleDependencyParse)
              .css('margin-right', '1em')
              .html("DP" + dependencyParseIndex);
            sentence_controls_div.append(dependency_parse_button);
          }
        }
      }
    }
  }
};


QL.drawConstituentParse = function(containerSelectorString, tokenization) {
  var
    constituent,
    constituentIndex,
    g = new dagreD3.Digraph();

  for (constituentIndex in tokenization.parse.constituentList) {
    constituent = tokenization.parse.constituentList[constituentIndex];
    if (constituent.childList.length === 0) {
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: "type-TOKEN" });
    }
    else {
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: "type-foo"});
    }
  }

  for (constituentIndex in tokenization.parse.constituentList) {
    constituent = tokenization.parse.constituentList[constituentIndex];
    if (constituent.childList.length > 0) {
      for (var childIndex in constituent.childList) {
        g.addEdge(null, constituent.id, constituent.childList[childIndex]);
      }
    }
  }

  QL.drawParse(containerSelectorString, g);
};


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

  for (i = 0; i < tokenization.tokenList.length; i++) {
    token = tokenization.tokenList[i];
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


QL.drawParse = function(containerSelectorString, digraph) {
  // Code adapted from dagre-d3 demo code:
  //   http://cpettitt.github.io/project/dagre-d3/latest/demo/sentence-tokenization.html

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
  var layout = renderer.run(digraph, d3.select(containerSelectorString).select("svg").select("g"));
  d3.select(containerSelectorString).select("svg")
    .attr("width", layout.graph().width + 40)
    .attr("height", layout.graph().height + 40);
};


QL.domHasConstituentParse = function(sentenceUUID) {
  if ($("#constituent_parse_" + sentenceUUID + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


QL.domHasDependencyParse = function(sentenceUUID, dependencyParseIndex) {
  if ($("#dependency_parse_" + sentenceUUID + "_" + dependencyParseIndex + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


QL.toggleConstituentParse = function(sentenceUUID) {
  if ($("#constituent_parse_" + sentenceUUID).css('display') == 'none') {
    $('#constituent_parse_button_' + sentenceUUID).addClass('active');
    $("#constituent_parse_" + sentenceUUID).show();
  }
  else {
    $('#constituent_parse_button_' + sentenceUUID).removeClass('active');
    $("#constituent_parse_" + sentenceUUID).hide();
  }
};


QL.toggleDependencyParse = function(sentenceUUID, dependencyParseIndex) {
  if ($("#dependency_parse_" + sentenceUUID + "_" + dependencyParseIndex).css('display') == 'none') {
    $('#dependency_parse_button_' + sentenceUUID + "_" + dependencyParseIndex).addClass('active');
    $("#dependency_parse_" + sentenceUUID + "_" + dependencyParseIndex).show();
  }
  else {
    $('#dependency_parse_button_' + sentenceUUID + "_" + dependencyParseIndex).removeClass('active');
    $("#dependency_parse_" + sentenceUUID + "_" + dependencyParseIndex).hide();
  }
};
