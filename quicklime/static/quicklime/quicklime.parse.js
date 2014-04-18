

function addConstituentParse(communicationUUID, sentenceUUID, tokenizationUUID) {
  var comm = getCommunicationWithUUID(comm);
  var tokenization = getTokenizationWithUUID(comm, tokenizationUUID);
  drawConstituentParse("#constituent_parse_" + sentenceUUID, tokenization);
}


function addDependencyParse(communicationUUID, sentenceUUID, tokenizationUUID) {
  var comm = getCommunicationWithUUID(comm);
  var tokenization = getTokenizationWithUUID(comm, tokenizationUUID);
  drawDependencyParse("#dependency_parse_" + sentenceUUID, tokenization);
}


/*
Add buttons to sentence_control <div>'s:

    <div class="sentence_controls" id="sentence_controls_[SENTENCE_UUID]">
+     <button>
+     <button>
+     ...
 */
function addSentenceParseControls(comm) {
  for (var sectionListIndex in comm.sectionSegmentations[0].sectionList) {
    if (comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation) {
      for (var sentenceIndex in comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList) {
        var sentence = comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList[sentenceIndex];
        var tokenization = sentence.tokenizationList[0];

        var sentence_controls_div = $('#sentence_controls_' + sentence.uuid);

	var constituent_parse_button = $('<button>')
          .attr('type', 'button')
          .addClass('btn btn-default btn-xs')
          .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid}, function(event) {
            if (hasConstituentParse(event.data.sentence_uuid)) {
              toggleConstituentParse(event.data.sentence_uuid);
            }
            else {
              addConstituentParse(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
            }
          })
          .css('margin-right', '1em')
          .html("CP");
	if (!tokenization.parse) {
	  constituent_parse_button.attr('disabled', 'disabled');
	}
	sentence_controls_div.append(constituent_parse_button);

	var dependency_parse_button = $('<button>')
          .attr('type', 'button')
          .addClass('btn btn-default btn-xs')
          .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid}, function(event) {
            if (hasDependencyParse(event.data.sentence_uuid)) {
              toggleDependencyParse(event.data.sentence_uuid);
            }
            else {
              addDependencyParse(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
            }
          })
          .css('margin-right', '1em')
          .html("DP");
	if (!tokenization.dependency_parse) {
	  dependency_parse_button.attr('disabled', 'disabled');
	}
	sentence_controls_div.append(dependency_parse_button);
      }
    }
  }
}


function drawConstituentParse(containerSelectorString, tokenization) {
  var g = new dagreD3.Digraph();

  for (var constituentIndex in tokenization.parse.constituentList) {
    var constituent = tokenization.parse.constituentList[constituentIndex];
    if (constituent.childList.length == 0) {
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: "type-TOKEN" });
    }
    else {
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: "type-foo"});
    }
  }

  for (var constituentIndex in tokenization.parse.constituentList) {
    var constituent = tokenization.parse.constituentList[constituentIndex];
    if (constituent.childList.length > 0) {
      for (var childIndex in constituent.childList) {
        g.addEdge(null, constituent.id, constituent.childList[childIndex]);
      }
    }
  }

  drawParse(containerSelectorString, g);
}


function drawDependencyParse(containerSelectorString, tokenization) {
  var g = new dagreD3.Digraph();

  // TODO: Handle multiple dependency parses, instead of just picking the first
  var dependencyParse = tokenization.dependencyParseList[0];

  var nodeSet = {};

  // Some tokens - such as punctuation marks - will not have nodes in the dependency parse
  for (var i = 0; i < dependencyParse.dependencyList.length; i++) {
    var dependency = dependencyParse.dependencyList[i];
    nodeSet[dependency.dep] = true;
    if (dependency.gov) {
      nodeSet[dependency.gov] = true;
    }
  }

  for (var i = 0; i < tokenization.tokenList.length; i++) {
    var token = tokenization.tokenList[i];
    if (token.tokenIndex in nodeSet) {
      g.addNode(token.tokenIndex, { label: token.text, nodeclass: "type-UNKNOWN" });
    }
  }

  for (var i = 0; i < dependencyParse.dependencyList.length; i++) {
    var dependency = dependencyParse.dependencyList[i];
    // The root edge will not have a 'gov'
    if (typeof(dependency.gov) != 'undefined') {
      g.addEdge(null, dependency.gov, dependency.dep, { label: dependency.edgeType });
    }
  }

  drawParse(containerSelectorString, g);
}


function drawParse(containerSelectorString, digraph) {
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
}


function hasConstituentParse(sentenceUUID) {
  if ($("#constituent_parse_" + sentenceUUID + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
}


function hasDependencyParse(sentenceUUID) {
  if ($("#dependency_parse_" + sentenceUUID + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
}


function toggleConstituentParse(sentenceUUID) {
  $("#constituent_parse_" + sentenceUUID).toggle('slow');
}


function toggleDependencyParse(sentenceUUID) {
  $("#dependency_parse_" + sentenceUUID).toggle('slow');
}
