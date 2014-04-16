// Hack: Use global variable to keep Communication around in memory
// TODO: Fix hack
var global_comm;

function getCommunicationWithUUID(uuid) {
  // TODO: Replace this stub with actual code
  return global_comm;
}

function getEntityMentionWithUUID(comm, uuid) {
  if (comm.entityMentionSets) {
    for (var entityMentionSetIndex in comm.entityMentionSets) {
      if (comm.entityMentionSets[entityMentionSetIndex].mentionSet) {
        for (var mentionSetIndex in comm.entityMentionSets[entityMentionSetIndex].mentionSet) {
          var entityMention = comm.entityMentionSets[entityMentionSetIndex].mentionSet[mentionSetIndex];
          if (entityMention.uuid == uuid) {
            return entityMention;
          }
        }
      }
    }
  }
  // TODO: Error handling if no matching UUID could be found
  console.log("ERROR: No EntityMention found with UUID " + uuid);
}

function getSentenceWithUUID(comm, uuid) {
  if (comm.sectionSegmentations[0].sectionList) {
    for (var sectionListIndex in comm.sectionSegmentations[0].sectionList) {
      if (comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation) {
        for (var sentenceIndex in comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList) {
          var sentence = comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList[sentenceIndex];
          if (sentence.uuid == uuid) {
            return sentence;
          }
        }
      }
    }
  }
  // TODO: Error handling if no matching UUID could be found
  console.log("ERROR: No Tokenization found with UUID " + uuid);
}

function getTokenizationWithUUID(comm, uuid) {
  if (comm.sectionSegmentations[0].sectionList) {
    for (var sectionListIndex in comm.sectionSegmentations[0].sectionList) {
      if (comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation) {
        for (var sentenceIndex in comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList) {
          var sentence = comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList[sentenceIndex];
          for (var tokenizationListIndex in sentence.tokenizationList) {
            if (sentence.tokenizationList[tokenizationListIndex].uuid == uuid) {
              return sentence.tokenizationList[tokenizationListIndex];
            }
          }
        }
      }
    }
  }
  // TODO: Error handling if no matching UUID could be found
  console.log("ERROR: No Tokenization found with UUID " + uuid);
}

function getTokensForEntityMentionID(comm, mentionId) {
  var entityMention = getEntityMentionWithUUID(comm, mentionId);
  var tokenization = getTokenizationWithUUID(comm, entityMention.tokens.tokenizationId);

  var tokens = new Array();

  for (var tokenIndex in entityMention.tokens.tokenIndexList) {
    tokens.push(tokenization.tokenList[entityMention.tokens.tokenIndexList[tokenIndex]].text);
  }
  return tokens;
}

function cleanedTokenText(tokenText) {
  // Convert Penn Treebank-style symbols for brackets to bracket characters
  //   http://www.cis.upenn.edu/~treebank/tokenization.html
  switch(tokenText) {
    case '-LRB-':
      return '(';
    case '-RRB-':
      return ')';
    case '-LSB-':
      return '[';
    case '-RSB-':
      return ']';
    case '-LCB-':
      return '{';
    case '-RCB-':
      return '}';
    default:
      return tokenText;
  }
}

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

function drawConstituentParse(containerSelectorString, tokenization) {
  var g = new dagreD3.Digraph();

  for (var constituentIndex in tokenization.parse.constituentList) {
    var constituent = tokenization.parse.constituentList[constituentIndex];
    if (constituent.headChildIndex == -1) {
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: "type-TOKEN" });
    }
    else {
      g.addNode(constituent.id, { label: constituent.tag, nodeclass: "type-foo"});
    }
  }

  for (var constituentIndex in tokenization.parse.constituentList) {
    var constituent = tokenization.parse.constituentList[constituentIndex];
    if (constituent.headChildIndex != -1) {
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

function hasPOSTags(sentenceUUID) {
  if ($("#sentence_pos_" + sentenceUUID + " svg").length > 0) {
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

function togglePOSTags(sentenceUUID) {
  $("#sentence_pos_" + sentenceUUID).toggle();
}

function addPOSTags(communicationUUID, sentenceUUID, tokenizationUUID) {
  var comm = getCommunicationWithUUID(communicationUUID);
  var sentence = getSentenceWithUUID(comm, sentenceUUID);
  var tokenization = getTokenizationWithUUID(comm, tokenizationUUID);

  var webFontURLs = [];

  // Tag names and colors are copied from the BRAT configuration file for
  // Stanford NLP:
  //   brat-v1.3_Crunchy_Frog/configurations/Stanford-CoreNLP/visual.conf
  var collData = {
    entity_types: [
      // Coordination, white
      { type: 'CC', labels: ['CC', 'CC'], bgColor: 'white' },

      // Punctuation, light grey
      /*
      { type: '-LRB-', labels: '-LRB-', bgColor: '#e3e3e3' },
      { type: '-RRB-', labels: '-RRB-', bgColor: '#e3e3e3' },
      { type: '__BACKTICK____BACKTICK__', labels: '``', bgColor: '#e3e3e3' },
      { type: '__COLON__', labels: ':', bgColor: '#e3e3e3' },
      { type: '__COMMA__', labels: ',', bgColor: '#e3e3e3' },
      { type: '__DOT__', labels: '.', bgColor: '#e3e3e3' },
      { type: '__DOUBLEQUOTE__', labels: '"', bgColor: '#e3e3e3' },
      { type: '__SINGLEQUOTE__', labels: "'", bgColor: '#e3e3e3' },
      */

      // Adjectives, yellowish
      { type: 'JJ', labels: ['JJ', 'JJ'], bgColor: '#fffda8' },
      { type: 'JJR', labels: ['JJR', 'JJR'], bgColor: '#fffda8' },
      { type: 'JJS', labels: ['JJS', 'JJS'], bgColor: '#fffda8' },

      // Adverbs, yellowish
      { type: 'RB', labels: ['RB', 'RB'], bgColor: '#fffda8' },
      { type: 'RBR', labels: ['RBR', 'RBR'], bgColor: '#fffda8' },
      { type: 'RBS', labels: ['RBS', 'RBS'], bgColor: '#fffda8' },
      { type: 'WRB', labels: ['WRB', 'WRB'], bgColor: '#fffda8' },

      // Determiners, greyish blue
      { type: 'DT', labels: ['DT', 'DT'], bgColor: '#ccadf6' },
      { type: 'PDT', labels: ['PDT', 'PDT'], bgColor: '#ccdaf6' },
      { type: 'WDT', labels: ['WDT', 'WDT'], bgColor: '#ccdaf6' },

      // Number, greyish blue
      { type: 'CD', labels: ['CD', 'CD'], bgColor: '#ccdaf6' },

      // Nouns, blue
      { type: 'NN', labels: ['NN', 'NN'], bgColor: '#a4bced' },
      { type: 'NNP', labels: ['NNP', 'NNP'], bgColor: '#a4bced' },
      { type: 'NNPS', labels: ['NNPS', 'NNPS'], bgColor: '#a4bced' },
      { type: 'NNS', labels: ['NNS', 'NNS'], bgColor: '#a4bced' },

      // Pronoun, greyish blue
      { type: 'PRP', labels: ['PRP', 'PRP'], bgColor: '#ccdaf6' },
      { type: 'PRP__DOLLAR__', labels: ['PRP$', 'PRP$'], bgColor: '#ccdaf6' },
      { type: 'WP', labels: ['WP', 'WP'], bgColor: '#ccdaf6' },
      { type: 'WP__DOLLAR__', labels: ['WP$', 'WP$'], bgColor: '#ccdaf6' },

      // Prepositions, brownish
      { type: 'IN', labels: ['IN', 'IN'], bgColor: '#ffe8be' },
      { type: 'TO', labels: ['TO', 'TO'], bgColor: '#ffe8be' },

      // Verbs, green
      { type: 'MD', labels: ['MD', 'MD'], bgColor: '#adf6a2' },
      { type: 'VB', labels: ['VB', 'VB'], bgColor: '#adf6a2' },
      { type: 'VBD', labels: ['VBD', 'VBD'], bgColor: '#adf6a2' },
      { type: 'VBG', labels: ['VBG', 'VBG'], bgColor: '#adf6a2' },
      { type: 'VBN', labels: ['VBN', 'VBN'], bgColor: '#adf6a2' },
      { type: 'VBP', labels: ['VBP', 'VBP'], bgColor: '#adf6a2' },
      { type: 'VBZ', labels: ['VBZ', 'VBZ'], bgColor: '#adf6a2' },

      // Misc., violet
      { type: 'EX', labels: ['EX', 'EX'], bgColor: '#e4cbf6' },
      { type: 'FW', labels: ['FW', 'FW'], bgColor: '#e4cbf6' },
      { type: 'LS', labels: ['LS', 'LS'], bgColor: '#e4cbf6' },
      { type: 'POS', labels: ['POS', 'POS'], bgColor: '#e4cbf6' },
      { type: 'RP', labels: ['RP', 'RP'], bgColor: '#e4cbf6' },
      { type: 'SYM', labels: ['SYM', 'SYM'], bgColor: '#e4cbf6' },
      { type: 'UH', labels: ['UH', 'UH'], bgColor: '#e4cbf6' },
      { type: '__DOLLAR__', labels: ['$', '$'], bgColor: '#e4cbf6' },
    ]
  };

  var comm = getCommunicationWithUUID(communicationUUID);
  var sentence_text = comm.text.substring(sentence.textSpan.start, sentence.textSpan.ending);
  var pos_tag_labels = [];

  for (var i = 0; i < tokenization.posTagList.taggedTokenList.length; i++) {
    var posTag = tokenization.posTagList.taggedTokenList[i];
    var token = tokenization.tokenList[posTag.tokenIndex];
    var entityID = "T" + (i+1);
    pos_tag_labels.push([entityID, posTag.tag, [[token.textSpan.start, token.textSpan.ending]]]);
  }

  var docData = {
    // Our text of choice
    text     : sentence_text,
    // The entities entry holds all entity annotations
    entities : pos_tag_labels,
  };

  Util.embed(
    // id of the div element where brat should embed the visualisations
    'sentence_pos_' + sentence.uuid,
    // object containing collection data
    collData,
    // object containing document data
    docData,
    // Array containing locations of the visualisation fonts
    webFontURLs
  );
}

/*
<div class="communication" id="communication_UUID">>
  <div class="section_segmentation" id="section_segmentation_UUID">
    <div class="section" id="section_UUID">
      <div class="sentence_segmentation" id="sentence_segmentation_UUID">
        <div class="sentence" id="sentence_UUID">>
          <div class="sentence_controls" id="sentence_controls_[SENTENCE_UUID]">
            <button>
            <button>
            ...
          <div class="tokenization" id="tokenization_UUID">
            <span class="token" id="tokenization_[TOKENIZATION_UUID]_[TOKEN_INDEX_0]">
            <span class="token_padding"id=" tokenization_[TOKENIZATION_UUID]_[TOKEN_INDEX_0]">
            <span class="token" id="tokenization_[TOKENIZATION_UUID]_[TOKEN_INDEX_1]">
            <span class="token_padding"id=" tokenization_[TOKENIZATION_UUID]_[TOKEN_INDEX_1]">
          ...
          <div class="brat_sentence" id="sentence_pos_[SENTENCE_UUID]">
          <div class="dagre_parse" id="constituent_pare_[SENTENCE_UUID]">
          <div class="dagre_parse" id="constituent_parse_[SENTENCE_UUID]">
*/
function addCommunication(parentElementID, comm) {
  global_comm = comm;

  var parent_element = $('#' + parentElementID);
  var document_div = $('<div>').addClass('communication').attr('id', 'communication_' + comm.uuid);
  parent_element.append(document_div);

  // For now, we assume that there is only a single section segmentation
  var section_segmentation_div = $('<div>').addClass('section_segmention')
    .attr('id', 'section_segmentation_' + comm.sectionSegmentations[0].uuid);

  for (var sectionListIndex in comm.sectionSegmentations[0].sectionList) {
    var section_div = $('<div>').addClass('section')
      .attr('id', 'section_' + comm.sectionSegmentations[0].sectionList[sectionListIndex].uuid);
    // For now, we assume that there is only a single sentence segmentation
    var sentence_segmentation_div = $('<div>').addClass('sentence_segmentation')
      .attr('id', 'sentence_segmentation_' + comm.sectionSegmentations[0].uuid);
    if (comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation) {
      for (var sentenceIndex in comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList) {
        var sentence = comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList[sentenceIndex];
        var tokenization = sentence.tokenizationList[0];

        var sentence_div = $('<div>')
          .addClass('sentence')
          .attr('id', 'sentence_' + sentence.uuid);
        var sentence_controls_div = $('<div>')
          .addClass('sentence_controls')
          .attr('id', 'sentence_controls_' + sentence.uuid);

        sentence_div.append(sentence_controls_div);

        var tokenization_div = $('<div>').addClass('tokenization').attr('id', 'tokenization_' + tokenization.uuid);
        for (var tokenIndex in tokenization.tokenList) {
          var token = tokenization.tokenList[tokenIndex];
          var token_span = $('<span>')
            .addClass('token')
            .attr('id', 'tokenization_' + tokenization.uuid + "_" + token.tokenIndex)
              .html(cleanedTokenText(token.text));
          var token_padding_span = $('<span>')
            .addClass('token_padding')
            .attr('id', 'tokenization_padding_' + tokenization.uuid + "_" + token.tokenIndex)
            .html(" ");
          tokenization_div.append(token_span);
          tokenization_div.append(token_padding_span);
        }
        sentence_div.append(tokenization_div);
        sentence_div.append($('<div>')
          .addClass('brat_sentence')
          .attr('id', 'sentence_pos_' + sentence.uuid));
        sentence_div.append($('<div>')
          .addClass('dagre_parse')
          .attr('id', 'constituent_parse_' + sentence.uuid));
        sentence_div.append($('<div>')
          .addClass('dagre_parse')
          .attr('id', 'dependency_parse_' + sentence.uuid));

        sentence_segmentation_div.append(sentence_div);
      }
      section_div.append(sentence_segmentation_div);
    }
    section_segmentation_div.append(section_div);
  }
  document_div.append(section_segmentation_div);

  // Add mentionId's to tokens
  for (var entityMentionSetIndex in comm.entityMentionSets) {
    if (comm.entityMentionSets[entityMentionSetIndex].mentionSet) {
      for (var mentionSetIndex in comm.entityMentionSets[entityMentionSetIndex].mentionSet) {
        var entityMention = comm.entityMentionSets[entityMentionSetIndex].mentionSet[mentionSetIndex];
        if (entityMention.tokens.tokenIndexList) {
          var total_tokens = entityMention.tokens.tokenIndexList.length;
          for (tokenIndex in entityMention.tokens.tokenIndexList) {
            $('#tokenization_' + entityMention.tokens.tokenizationId + '_' + entityMention.tokens.tokenIndexList[tokenIndex])
              .addClass('mention')
              .addClass('mention_' + entityMention.uuid);
            // For multi-word mentions, the spaces between tokens are treated as part of the mention
            if (tokenIndex < total_tokens-1) {
              $('#tokenization_padding_' + entityMention.tokens.tokenizationId + '_' + entityMention.tokens.tokenIndexList[tokenIndex])
                .addClass('mention')
                .addClass('mention_' + entityMention.uuid);
            }
          }
        }
      }
    }
  }
}

function addEntityList(comm) {
  // Add list of entities, and list of mentions for each entity, to the DOM
  for (var entityListIndex in comm.entitySets[0].entityList) {
    var entityList = comm.entitySets[0].entityList[entityListIndex];
    var entityList_div = $('<div>')
      .html('<b>Entity:</b> <span class="entity_' + entityList.uuid + '">' + entityList.uuid + '</span>');
    var mentionId_ul = $('<ul class="list-inline">');

    for (var mentionIdListIndex in entityList.mentionIdList) {
      var mentionId = entityList.mentionIdList[mentionIdListIndex];
      var mentionId_li = $('<li>')
        .html('<span class="mention_' + mentionId + '">' + getTokensForEntityMentionID(comm, mentionId).join(" ") + '</span>');
      mentionId_ul.append(mentionId_li);

      // Add 'entity_ENTITY_UUID' class to each mention of that entity
      $('.mention_' + mentionId).addClass('entity_' + entityList.uuid);
    }
    entityList_div.append(mentionId_ul);

    $('#entityList').append(entityList_div);
  }
}

function addEntityMouseoverHighlighting(comm) {
  // Add mouseover functions for all elements linked to an entity
  for (var entityListIndex in comm.entitySets[0].entityList) {
    var entity = comm.entitySets[0].entityList[entityListIndex];
    $('.entity_' + entity.uuid).mouseenter({ entity_selector: '.entity_' + entity.uuid }, function(event) {
      $(event.data.entity_selector).addClass("highlighted_entity");
    }).mouseleave({ entity_selector: '.entity_' + entity.uuid }, function(event) {
      $(event.data.entity_selector).removeClass("highlighted_entity");
    });
  }

  // Add mouseover functions for all elements linked to a mention
  for (var entityMentionSetIndex in comm.entityMentionSets) {
    for (var mentionSetIndex in comm.entityMentionSets[entityMentionSetIndex].mentionSet) {
      var entityMention = comm.entityMentionSets[entityMentionSetIndex].mentionSet[mentionSetIndex];
      $('.mention_' + entityMention.uuid).mouseenter({ mention_selector: '.mention_'+entityMention.uuid }, function(event) {
        $(event.data.mention_selector).addClass("highlighted_mention");
      }).mouseleave({ mention_selector: '.mention_'+entityMention.uuid }, function(event) {
        $(event.data.mention_selector).removeClass("highlighted_mention");
      });
    }
  }
}

/*
Add buttons to sentence_control <div>'s:

    <div class="sentence_controls" id="sentence_controls_[SENTENCE_UUID]">
+     <button>
+     <button>
+     ...
 */
function addSentenceControls(comm) {
  for (var sectionListIndex in comm.sectionSegmentations[0].sectionList) {
    if (comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation) {
      for (var sentenceIndex in comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList) {
        var sentence = comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList[sentenceIndex];
        var tokenization = sentence.tokenizationList[0];

        sentence_controls_div = $('#sentence_controls_' + sentence.uuid);

        sentence_controls_div.append($('<button>')
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
          .html("CP"));
       sentence_controls_div.append($('<button>')
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
          .html("DP"));
       sentence_controls_div.append($('<button>')
          .attr('type', 'button')
          .addClass('btn btn-default btn-xs')
          .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid}, function(event) {
            if (hasPOSTags(event.data.sentence_uuid)) {
              togglePOSTags(event.data.sentence_uuid);
            }
            else {
              addPOSTags(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
            }
          })
          .css('margin-right', '1em')
          .html("POS"));
      }
    }
  }
}
