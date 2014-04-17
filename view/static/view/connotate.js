

// <HACK> Use global variable to keep Communication around in memory
// TODO: Fix hack
var global_comm;

function getCommunicationWithUUID(uuid) {
  // TODO: Replace this stub with actual code
  return global_comm;
}
// </HACK>


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
          .attr('id', 'sentence_ner_' + sentence.uuid));
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
