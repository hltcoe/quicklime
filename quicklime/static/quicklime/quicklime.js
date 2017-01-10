/*
Quicklime creates a DOM structure for a Communication:

<div class="communication" id="communication_UUID">>
  <div class="section" id="section_UUID">
    <div class="sentence" id="sentence_UUID">>
      <div class="controls_and_tokenization_container clearfix">
        <div class="tokenization_controls" id="tokenization_controls_[TOKENIZATION_UUID]">
          <button>
          <button>
          ...
        <div class="tokenization" id="tokenization_UUID">
          <span class="token" id="tokenization_[TOKENIZATION_UUID]_[TOKEN_INDEX_0]">
          <span class="token_padding "id="tokenization_[TOKENIZATION_UUID]_[TOKEN_INDEX_0]">
          <span class="token" id="tokenization_[TOKENIZATION_UUID]_[TOKEN_INDEX_1]">
          <span class="token_padding" id="tokenization_[TOKENIZATION_UUID]_[TOKEN_INDEX_1]">
        ...
      <div class="brat_tokenization_container" id="tokenization_ner_container_[TOKENIZATION_UUID]">
        <div class="brat_tokenization_label brat_ner_tokenization_label">
        <div class="brat_tokenization" id="tokenization_ner_[TOKENIZATION_UUID]">
      <div class="brat_tokenization_container" id="tokenization_pos_container_[TOKENIZATION_UUID]">
        <div class="brat_tokenization_label brat_pos_tokenization_label">
        <div class="brat_tokenization" id="tokenization_pos_[TOKENIZATION_UUID]">
      <div class="dagre_parse" id="constituent_parse_[TOKENIZATION_UUID]">
        <div class="dagre_parse" id="constituent_parse_[TOKENIZATION_UUID]_0">
          <div class="parse_label constituent_parse_label_0">
        <div class="dagre_parse" id="constituent_parse_[TOKENIZATION_UUID]_1">
          <div class="parse_label constituent_parse_label_1">
        ...
      <div class="dagre_parse" id="dependency_parse_[TOKENIZATION_UUID]">
        <div class="dagre_parse" id="dependency_parse_[TOKENIZATION_UUID]_0">
          <div class="parse_label dependency_parse_label_0">
        <div class="dagre_parse" id="dependency_parse_[TOKENIZATION_UUID]_1">
          <div class="parse_label dependency_parse_label_1">
        ...
*/


// Namespace for Quicklime
var QL = {
    _communications: {}
};


/** Get Communication with UUID from set of Communications already in memory
 * @param {concrete.UUID} uuid
 * @returns {concrete.Communication}
 */
QL.getCommunicationWithUUID = function(uuid) {
  return QL._communications[uuid.uuidString];
};


/** Adds <div>/<span> elements and token text for a Communication to DOM
 *
 * Concrete Communications can contain a list of Sections, and each
 * Section can contain al ist of Sentences.
 *
 * This function takes a Concrete Communication, and adds layers of
 * nested <div>'s and <span>'s to the DOM that reflect the nested data
 * structures in the Communication (with some extra nesting of <div>'s
 * and <span>'s so that the HTML is rendered properly).
 *
 * For each Concrete object of type:
 *   - Section
 *   - Sentence
 *   - Tokenization
 * there is a corresponding <div> with a DOM ID based on the UUID of
 * that Concrete object.
 *
 * Each token string and each space between tokens is wrapped in its
 * own <span>, and these <span>'s have DOM IDs determined by the
 * Tokenization UUID and token index.
 *
 * This function also adds co-reference information to token <span>'s.
 * For each EntityMention, this function finds the token <span>'s
 * associated with the mention, and adds a unique DOM class name
 * (based on the EntityMention's UUID) to each matching token <span>.
 * The function also finds the Entity associated with each
 * EntityMention, and adds a unique DOM class name for that Entity
 * (based on the Entity's UUID) to each matching token <span>.
 *
 * A single token <span> may be assigned many DOM class names.  All
 * these class names make it easy to do things like change the CSS
 * properties (or attach a mouse callback function) to every token
 * associated with an Entity or EntityMention.
 *
 * @param {String} parentElementID - DOM ID of element to attach Communication text to
 * @param {concrete.Communication} comm
 */
QL.addCommunication = function(parentElementID, comm, showTokenizationControls) {
  // Add Communication to set of communications (a global variable) in QL namespace
  QL._communications[comm.uuid.uuidString] = comm;

  var parent_element = $('#' + parentElementID);
  var document_div = $('<div>').addClass('communication').attr('id', 'communication_' + comm.uuid.uuidString);
  parent_element.append(document_div);

  for (var sectionListIndex in comm.sectionList) {
    var section = comm.sectionList[sectionListIndex];
    var section_div = $('<div>').addClass('section')
      .attr('id', 'section_' + section.uuid.uuidString);
    var sentence_div;

    if (section.sentenceList) {
      for (var sentenceIndex in section.sentenceList) {
        var sentence = section.sentenceList[sentenceIndex];
        var tokenization = sentence.tokenization;

        sentence_div = $('<div>')
          .addClass('sentence')
          .attr('id', 'sentence_' + sentence.uuid.uuidString);

        // Add the Bootstrap CSS class 'clearfix' to the
        // 'controls_and_tokenization_container' <div>, so that the
        // (floating) 'tokenization_controls' and 'tokenization' <div>'s
        // in the container don't affect other <div>'s
        var controls_and_tokenization_container_div = $('<div>')
          .addClass('controls_and_tokenization_container')
          .addClass('clearfix');

        var tokenization_controls_div = $('<div>')
          .addClass('tokenization_controls')
          .attr('id', 'tokenization_controls_' + tokenization.uuid.uuidString);
        if (!showTokenizationControls) {
          tokenization_controls_div.css('display', 'none');
        }

        controls_and_tokenization_container_div.append(tokenization_controls_div);

        var tokenization_div = $('<div>').addClass('tokenization').attr('id', 'tokenization_' + tokenization.uuid.uuidString);
        for (var tokenIndex in tokenization.tokenList.tokenList) {
          var token = tokenization.tokenList.tokenList[tokenIndex];
          var token_span = $('<span>')
            .addClass('token')
            .attr('id', 'tokenization_' + tokenization.uuid.uuidString + "_" + token.tokenIndex)
              .html(QL.cleanedTokenText(token.text));
          var token_padding_span = $('<span>')
            .addClass('token_padding')
            .attr('id', 'tokenization_padding_' + tokenization.uuid.uuidString + "_" + token.tokenIndex)
            .html(" ");
          tokenization_div.append(token_span);
          tokenization_div.append(token_padding_span);
        }
        controls_and_tokenization_container_div.append(tokenization_div);

        sentence_div.append(controls_and_tokenization_container_div);

        sentence_div.append(
          $('<div>')
            .addClass('brat_tokenization_container')
            .attr('id', 'tokenization_ner_container_' + tokenization.uuid.uuidString)
            .css("display", "none")
            .append(
              $('<div>')
                .addClass('brat_tokenization_label brat_ner_tokenization_label')
                .html("NER")
            )
            .append(
              $('<div>')
                .addClass('brat_tokenization')
                .attr('id', 'tokenization_ner_' + tokenization.uuid.uuidString)));
        sentence_div.append(
          $('<div>')
            .addClass('brat_tokenization_container')
            .attr('id', 'tokenization_pos_container_' + tokenization.uuid.uuidString)
            .css("display", "none")
            .append(
              $('<div>')
                .addClass('brat_tokenization_label brat_pos_tokenization_label')
                .html("POS")
            )
            .append(
              $('<div>')
                .addClass('brat_tokenization')
                .attr('id', 'tokenization_pos_' + tokenization.uuid.uuidString)));
        sentence_div.append(
          $('<div>')
            .addClass('brat_tokenization_container')
            .attr('id', 'tokenization_ans_container_' + tokenization.uuid.uuidString)
            .css("display", "none")
            .append(
              $('<div>')
                .addClass('brat_tokenization_label brat_ans_tokenization_label')
                .html("ANS")
            )
            .append(
              $('<div>')
                .addClass('brat_tokenization')
                .attr('id', 'tokenization_ans_' + tokenization.uuid.uuidString)));
        sentence_div.append(
          $('<div>')
            .addClass('situation_mention_sets_container')
            .attr('id', 'situation_mention_sets_container_' + tokenization.uuid.uuidString));
        sentence_div.append($('<div>')
          .addClass('dagre_parse')
          .attr('id', 'constituent_parse_' + tokenization.uuid.uuidString));
        sentence_div.append($('<div>')
          .addClass('dagre_parse')
          .attr('id', 'dependency_parse_' + tokenization.uuid.uuidString));
        sentence_div.append($('<div>')
          .addClass('dagre_parse')
          .attr('id', 'ace_relations_' + tokenization.uuid.uuidString));

        section_div.append(sentence_div);
      }
    }
    document_div.append(section_div);
  }

  // Add DOM classes for mentionId's to token <span>'s
  for (var entityMentionSetIndex in comm.entityMentionSetList) {
    QL.addDOMClassesForEntityMentionSet(comm.entityMentionSetList[entityMentionSetIndex]);
  }

  // Add DOM classes for entity and entity_set UUID's to EntityMentions for the Entities
  if (comm.entitySetList) {
    for (var entitySetListIndex in comm.entitySetList) {
      for (var entityListIndex in comm.entitySetList[entitySetListIndex].entityList) {
        var entity = comm.entitySetList[entitySetListIndex].entityList[entityListIndex];
        for (var i = 0; i < entity.mentionIdList.length; i++) {
          var entityMentionId = entity.mentionIdList[i];
          $('.entity_mention_' + entityMentionId.uuidString)
            .addClass('entity_' + entity.uuid.uuidString)
            .addClass('entity_set_' + comm.entitySetList[entitySetListIndex].uuid.uuidString);
        }
      }
    }
  }
};


/** Add DOM classes to token <span>'s for tokens in an EntityMentionSet
 * @param {concrete.EntityMentionSet} entityMentionSet
 */
QL.addDOMClassesForEntityMentionSet = function(entityMentionSet) {
  if (entityMentionSet.mentionList) {
    for (var mentionListIndex in entityMentionSet.mentionList) {
      var entityMention = entityMentionSet.mentionList[mentionListIndex];
      QL.addDOMClassForTokenRefSequence(
        entityMention.tokens,
        "entity_mention entity_mention_" + entityMention.uuid.uuidString +
          " entity_mention_set_" + entityMentionSet.uuid.uuidString);
    }
  }
};


/** Add DOM class(es) to token <span>'s identified by TokenRefSequence
 *  To specify multiple classes, create a single string with the class
 *  names separated by spaces.
 *
 * @param {concrete.TokenRefSequence} tokenRefSequence
 * @param {String} className - DOM class(es) to be added to token <span>'s
 */
QL.addDOMClassForTokenRefSequence = function(tokenRefSequence, className) {
  if (tokenRefSequence.tokenIndexList) {
    // Unlike Array.sort(), Underscore's sortBy() sorts arrays of numbers *numerically*
    var tokenIndexList = _.sortBy(tokenRefSequence.tokenIndexList);
    var total_tokens = tokenRefSequence.tokenIndexList.length;

    for (var tokenIndex in tokenIndexList) {
      $('#tokenization_' + tokenRefSequence.tokenizationId.uuidString + '_' + tokenIndexList[tokenIndex])
        .addClass(className);

      // For multi-word mentions, the spaces between tokens are treated as part of the mention
      if (tokenIndex < total_tokens-1 &&
          tokenIndexList[tokenIndex]+1 === tokenIndexList[parseInt(tokenIndex, 10)+1])
      {
        $('#tokenization_padding_' + tokenRefSequence.tokenizationId.uuidString + '_' + tokenIndexList[tokenIndex])
          .addClass(className);
      }
    }
  }
};


/** Add a list of entities, with their mentions, to the DOM
 * @param {String} parentElementID - DOM ID of element to attach table to
 * @param {concrete.Communication} comm
 */
QL.addEntityTable = function(parentElementID, comm) {

  function toggleEntitySetHighlighting(event) {
    if ($(this).is(":checked")) {
      QL.addMouseoverHighlightingForEntitySet(event.data.entitySet);
    }
    else {
      QL.removeMouseoverHighlightingForEntitySet(event.data.entitySet);
    }
  }

  if (comm.entitySetList) {
    var entityTable_div = $('<div>');
    $('#' + parentElementID).append(entityTable_div);

    for (var entitySetListIndex in comm.entitySetList) {
      var entitySetPanel_div = $('<div>').addClass('panel panel-default');

      var entityToolHeading = $('<a>')
        .attr('data-toggle', 'collapse')
        .attr('href', '#collapseEntitySet_' + comm.entitySetList[entitySetListIndex].uuid.uuidString);
      if (comm.entitySetList[entitySetListIndex].metadata) {
        entityToolHeading.html(comm.entitySetList[entitySetListIndex].metadata.tool);
      }
      else {
        entityToolHeading.html('Unknown Entity Tool #' + entitySetListIndex);
      }
      entitySetPanel_div.append(
        $('<div>').addClass('panel-heading')
          .append(
            $('<h4>')
              .addClass('panel-title')
              .addClass('toolname_title')
              .append(
                $('<input>')
                  .attr('type', 'checkbox')
                  .addClass('entity_set_highlighting_checkbox')
                  .click({'entitySet': comm.entitySetList[entitySetListIndex]}, toggleEntitySetHighlighting))
              .append(
                entityToolHeading)));

      var entityList_div = $('<div>');
      for (var entityListIndex in comm.entitySetList[entitySetListIndex].entityList) {
        var counter = parseInt(entityListIndex, 10) + 1;
        var entity = comm.entitySetList[entitySetListIndex].entityList[entityListIndex];
        var entity_div = $('<div>');
        var entityCounter_span = $('<span>')
          .addClass('entity_counter')
          .addClass('entity_' + entity.uuid.uuidString)
          .html('Entity ' + counter);
        entity_div.append(entityCounter_span);

        var entityTotal_span = $('<span>')
          .addClass('entity_total')
          .html('(x' + entity.mentionIdList.length + ')');
        entity_div.append(entityTotal_span);

        var mentionId_ul = $('<ul class="list-inline">').addClass('entity_list');
        for (var mentionIdListIndex in entity.mentionIdList) {
          var mentionId = entity.mentionIdList[mentionIdListIndex];
          var mentionId_li = $('<li>')
            .html('<span class="mention_for_active_entity_set entity_mention_' + mentionId.uuidString + '">' + comm.getTokensForEntityMentionID(mentionId).join(" ") + '</span>');
          mentionId_ul.append(mentionId_li);
        }
        entity_div.append(mentionId_ul);
        entityList_div.append(entity_div);
      }
      entitySetPanel_div.append(
        $('<div>')
          .attr('id', 'collapseEntitySet_' + comm.entitySetList[entitySetListIndex].uuid.uuidString)
          .addClass('panel-collapse collapse in')
          .append(
            $('<div>')
              .addClass('panel-body')
              .append(
                entityList_div)));
      entityTable_div.append(entitySetPanel_div);
    }
  }
};


/** Add mouseover event handlers for all EntitySets in a Communication
 *
 * @param {concrete.Communication} comm
 */
QL.addMouseoverHighlightingForAllEntitySets = function(comm) {
  if (comm.entitySetList) {
    for (var entitySetListIndex in comm.entitySetList) {
      QL.addMouseoverHighlightingForEntitySet(comm.entitySetList[entitySetListIndex]);
    }
  }
};


/** Add mouseover event handlers for EntityMentions for an EntitySet
 *
 * For each Entity in the given EntityList, find all DOM elements
 * associated with the EntityMentions for that Entity, and add
 * mouseover event handlers to those DOM elements.
 *
 * NOTE: Inverse of QL.removeMouseoverHighlightingForEntitySet()
 *
 * @param {concrete.EntitySet} entitySet
 */
QL.addMouseoverHighlightingForEntitySet = function(entitySet) {
  // Add mouseover functions for all elements linked to an entity
  if (entitySet.entityList) {
    var callbacks = QL.getEntitySetHighlightCallbacks(entitySet);

    for (var entityListIndex in entitySet.entityList) {
      var entity = entitySet.entityList[entityListIndex];
      $('.entity_' + entity.uuid.uuidString)
        .on('click', { entity_selector: '.entity_' + entity.uuid.uuidString }, callbacks.toggleSelectedEntity)
        .on('mouseenter', { entity_selector: '.entity_' + entity.uuid.uuidString }, callbacks.addHighlightToEntity)
        .on('mouseleave', { entity_selector: '.entity_' + entity.uuid.uuidString }, callbacks.removeHighlightFromEntity);

      // Add mouseover functions for all elements linked to a mention of an entity in entitySet.
      // Mouseover functions will not be added to any mentions - such as value mentions - that are
      // not linked to an entity in entitySet.
      for (var i = 0; i < entity.mentionIdList.length; i++) {
        var entityMentionId = entity.mentionIdList[i];
        $('.entity_mention_' + entityMentionId.uuidString)
          .on('click', { entity_selector: '.entity_' + entity.uuid.uuidString }, callbacks.toggleSelectedEntity)
          .on('mouseenter', { mention_selector: '.entity_mention_'+entityMentionId.uuidString }, callbacks.addHighlightToMention)
          .on('mouseleave', { mention_selector: '.entity_mention_'+entityMentionId.uuidString }, callbacks.removeHighlightFromMention);
      }
    }
  }

  $('.entity_set_' + entitySet.uuid.uuidString)
    .addClass('mention_for_active_entity_set')
    .increment_counter('active-entity-sets');
};


/** Add a tooltip with Concrete Metadata information to a jQuery object
 * @param {jQuery object} obj - jQuery object for DOM element
 * @param {concrete.Metadata} metadata
 */
QL.addMetadataTooltip = function(obj, metadata) {
  obj
    .attr('data-placement', 'auto top')
    .attr('data-toggle', 'tooltip')
    .attr('title', metadata.tool)
    .tooltip();
};


/** Add a "table" listing SituationMentions in a Communication
 * @param {String} parentElementID - DOM ID of element to attach Communication text to
 * @param {concrete.Communication} comm
 */
QL.addSituationMentionTable = function(parentElementID, comm) {
  if (comm.situationMentionSetList) {
    var situationMentionTable_div = $('<div>');
    $('#' + parentElementID).append(situationMentionTable_div);

    for (var smsIndex in comm.situationMentionSetList) {
      var situationMentionPanel_div = $('<div>').addClass('panel panel-default');
      situationMentionTable_div.append(situationMentionPanel_div);
      var situationMentionSet = comm.situationMentionSetList[smsIndex];
      var toolname = situationMentionSet.metadata.tool;

      var situationMentionToolHeading = $('<a>')
        .attr('data-toggle', 'collapse')
        .attr('href', '#collapseSituationMentionSet_' + situationMentionSet.uuid.uuidString);
      if (situationMentionSet.metadata) {
        situationMentionToolHeading.html(situationMentionSet.metadata.tool);
      }
      else {
        situationMentionToolHeading.html('Unknown Situation Mention Tool #' + smsIndex);
      }
      situationMentionPanel_div.append(
        $('<div>').addClass('panel-heading')
          .append(
            $('<h4>')
              .addClass('panel-title')
              .addClass('toolname_title')
              .append(
                situationMentionToolHeading)));

      var situationMentionList_div = $('<div>').addClass('entity_list');
      situationMentionPanel_div.append(
        $('<div>')
          .attr('id', 'collapseSituationMentionSet_' + situationMentionSet.uuid.uuidString)
          .addClass('panel-collapse collapse in')
          .append(
            $('<div>')
              .addClass('panel-body')
              .append(
                situationMentionList_div)));

      for (var situationMentionIndex in situationMentionSet.mentionList) {
        var situationMention = situationMentionSet.mentionList[situationMentionIndex];
        var container_id = 'situation_mention_container_' + situationMention.uuid.uuidString;
        situationMentionList_div.append(
          $('<div>')
            .attr('id', container_id)
            .css('margin-bottom', '5px'));
        QL.brat.addSituationMention(container_id, comm, situationMention, toolname);
/*
          .append(
            $('<button>')
              .addClass('btn btn-default btn-xs')
              .attr('id', 'situation_mention_button_' + situationMention.uuid.uuidString)
              .attr('type', 'button')
              .click({ container_id: 'situation_mention_container_' + situationMention.uuid.uuidString,
                       comm: comm,
                       situationMention: situationMention}, function(event) {
                         QL.brat.addSituationMention(event.data.container_id, event.data.comm, event.data.situationMention);
                       })
              .css('margin-right', '1em')
              .html("SM"))
          .append(
            $('<span>')
              .attr('id', 'situation_mention_container_' + situationMention.uuid.uuidString))
          .append(
            $('<span>')
              .addClass('situation_mention_' + situationMention.uuid.uuidString)
              .html(situationMention.situationType + ': ' + situationMention.text));
*/
/*
        for (var argumentListIndex in situationMention.argumentList) {
          var mentionArgument = situationMention.argumentList[argumentListIndex];
          if (mentionArgument.entityMentionId) {
            var entityMention = comm.getEntityMentionWithUUID(mentionArgument.entityMentionId);
            var entity = comm.getEntityForEntityMentionUUID(mentionArgument.entityMentionId);

            var entityMention_span = $('<span>')
              .addClass('entity_mention entity_mention_' + mentionArgument.entityMentionId.uuidString)
              .html('<br>' + QL.getTextForTokenRefSequence(comm, entityMention.tokens));
            if (entity) {
              entityMention_span.addClass('entity entity_' + entity.uuid.uuidString);
            }
            situationMention_li.append(entityMention_span);

            if (mentionArgument.role) {
              situationMention_li.append(
                $('<span>')
                  .html(" (" + mentionArgument.role + ") "));
            }
          }
          else if (mentionArgument.situationMentionId) {
            var argumentSituationMention = comm.getSituationMentionWithUUID(mentionArgument.situationMentionId);
            situationMention_li.append(
              $('<span>')
                .addClass('situation_mention situation_mention_' + mentionArgument.situationMentionId.uuidString)
                .html('<br>' + QL.getTextForTokenRefSequence(comm, argumentSituationMention.tokens)));
            if (mentionArgument.role) {
              argumentSituationMention_li.append(
                $('<span>')
                  .html(" (" + mentionArgument.role + ") "));
            }
          }
        }
        situationMentionList_ul.append(situationMention_li);
*/
      }
    }
  }
};


/** Function takes a token string, returns a "cleaned" version of that string
 * @param {String} tokenText
 * @returns {String}
 */
QL.cleanedTokenText = function(tokenText) {
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
      return tokenText.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
  }
};


/** Get set of callback functions for highlighting EntityMentions for this EntitySet
 *
 * This function retrieves (and, when necessary, creates) a set of
 * named callback functions that are tied to a particular EventSet.
 *
 * This may require a bit of explanation...
 *
 * We want to be able to add/remove callback functions for all DOM
 * elements that are associated with a particular EntitySet.  Because
 * a single DOM element may be associated with multiple EntitySets
 * (e.g. a token <span> that is part of different EntityMentions from
 * different EntitySets), we need the ability to remove the
 * addHighlightToEntity() function associated with EntitySet 'A' from
 * an element without removing the addHighlightToEntity() function
 * associated with EntitySet 'B' from that element.
 *
 * In order to remove a particular event handler for an event (but not
 * *all* event handlers for an event), we need to be able to pass
 * jQuery.off() a named function.
 *
 * @param {concrete.EntitySet} entitySet
 */
QL.getEntitySetHighlightCallbacks = function(entitySet) {
  /**
   * @param {MouseEvent} event
   */
  function addHighlightToEntity(event) {
    $(event.data.entity_selector).addClass("highlighted_entity");
  }

  /**
   * @param {MouseEvent} event
   */
  function addHighlightToMention(event) {
    $(event.data.mention_selector).addClass("highlighted_mention");
  }

  /**
   * @param {MouseEvent} event
   */
  function removeHighlightFromEntity(event) {
    $(event.data.entity_selector).removeClass("highlighted_entity");
  }

  /**
   * @param {MouseEvent} event
   */
  function removeHighlightFromMention(event) {
    $(event.data.mention_selector).removeClass("highlighted_mention");
  }

  /**
   * @param {MouseEvent} event
   */
  function toggleSelectedEntity(event) {
    $(event.data.entity_selector).toggleClass("selected_entity");
  }

  if (!QL._entity_set_callbacks) {
    QL._entity_set_callbacks = {};
  }
  if (!QL._entity_set_callbacks[entitySet.uuid.uuidString]) {
    QL._entity_set_callbacks[entitySet.uuid.uuidString] = {
      'addHighlightToEntity': function(event) { addHighlightToEntity(event); },
      'addHighlightToMention': function(event) { addHighlightToMention(event); },
      'removeHighlightFromEntity': function(event) { removeHighlightFromEntity(event); },
      'removeHighlightFromMention': function(event) { removeHighlightFromMention(event); },
      'toggleSelectedEntity': function(event) { toggleSelectedEntity(event); }
    };
  }
  return QL._entity_set_callbacks[entitySet.uuid.uuidString];
};


/** Returns array of distinct Tokenization UUID's for a SituationMention and its arguments
 *
 * The length of the returned array is 1 if all mentions belong to a single tokenization.
 *
 * @param {concrete.Communication} comm
 * @param {concrete.SituationMention} situationMention
 * @returns {Array} An array of concrete.UUID objects
 */
QL.getSituationMentionTokenizationIds = function(comm, situationMention) {
  var tokenizationIds = [];
  var tokenizationIdStrings = [];
  if (situationMention.tokens) {
    tokenizationIds.push(situationMention.tokens.tokenizationId);
    tokenizationIdStrings.push(situationMention.tokens.tokenizationId.uuidString);
  }
  for (var i = 0, l = situationMention.argumentList.length; i < l; i++) {
    var argument = situationMention.argumentList[i];
    if (argument.entityMentionId) {
      var entityMentionArgument = comm.getEntityMentionWithUUID(argument.entityMentionId);
      if (tokenizationIdStrings.indexOf(entityMentionArgument.tokens.tokenizationId.uuidString) === -1) {
        tokenizationIds.push(entityMentionArgument.tokens.tokenizationId);
        tokenizationIdStrings.push(entityMentionArgument.tokens.tokenizationId.uuidString);
      }
    }
    else if (argument.situationMentionId) {
      var situationMentionArgument = comm.getSituationMentionWithUUID(argument.situationMentionId);
      if (situationMentionArgument.tokens &&
          tokenizationIdStrings.indexOf(situationMentionArgument.tokens.tokenizationId.uuidString) === -1)
      {
        tokenizationIds.push(situationMentionArgument.tokens.tokenizationId);
        tokenizationIdStrings.push(situationMentionArgument.tokens.tokenizationId.uuidString);
      }
    }
  }

  return tokenizationIds;
};


/** Returns a single string for the tokens pointed to by the TokenRefSequence.
 *  If not all tokens in the TokenRefSequence are adjacent, the HTML entity
 *  for '...' will be inserted where there are gaps.
 *
 * @param {concrete.Communication} comm
 * @param {concrete.TokenRefSequence] tokenRefSequence
 * @returns {String}
 */
QL.getTextForTokenRefSequence = function(comm, tokenRefSequence) {
  var tokenization = comm.getTokenizationWithUUID(tokenRefSequence.tokenizationId);

  var text = "";
  for (var i=0, total_tokens=tokenRefSequence.tokenIndexList.length; i < total_tokens; i++) {
    text += tokenization.tokenList.tokenList[tokenRefSequence.tokenIndexList[i]].text + " ";
    if (i < total_tokens-1 && tokenRefSequence.tokenIndexList[i]+1 !== tokenRefSequence.tokenIndexList[i+1]) {
      text += "&hellip; ";
    }
  }

  return text;
};


/** Retrieve HTTP GET parameters by name
 *
 * Copied from:
 *   http://stackoverflow.com/questions/19491336/get-url-parameter-jquery-or-how-to-get-query-string-values-in-js
 */
QL.getUrlParameter = function(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
      sURLVariables = sPageURL.split('&'),
      sParameterName,
      i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
};


/** Remove mouseover event handlers for EntityMentions for an EntitySet
 *
 * NOTE: Inverse of QL.addMouseoverHighlightingForEntitySet()
 *
 * @param {concrete.EntitySet} entitySet
 */
QL.removeMouseoverHighlightingForEntitySet = function(entitySet) {
  // Remove mouseover functions for all elements linked to an entity
  if (entitySet.entityList) {
    var callbacks = QL.getEntitySetHighlightCallbacks(entitySet);

    for (var entityListIndex in entitySet.entityList) {
      var entity = entitySet.entityList[entityListIndex];
      $('.entity_' + entity.uuid.uuidString)
        .off('click', callbacks.toggleSelectedEntity)
        .off('mouseenter', callbacks.addHighlightToEntity)
        .off('mouseleave', callbacks.removeHighlightFromEntity);

      for (var i = 0; i < entity.mentionIdList.length; i++) {
        var entityMentionId = entity.mentionIdList[i];
        $('.entity_mention_' + entityMentionId.uuidString)
          .off('click', callbacks.toggleSelectedEntity)
          .off('mouseenter', callbacks.addHighlightToMention)
          .off('mouseleave', callbacks.removeHighlightFromMention);
      }
    }
  }

  // Remove CSS class when counter reaches 0
  $('.entity_set_' + entitySet.uuid.uuidString)
    .decrement_counter('active-entity-sets')
    .filter(function() {
      if ($(this).data('active-entity-sets') === 0) {
        $(this).removeClass('mention_for_active_entity_set');
      }
    });
};


/** jQuery function to increment counter attached to DOM element's data attribute
 * @param {String} prop - Name of data property to be incremented
 */
(function($) {
  $.fn.increment_counter = function(prop) {
    return this.each(function() {
      var data = $(this).data();
      if(!(prop in data)) {
        data[prop] = 1;
      }
      else {
        data[prop] += 1;
      }
    });
  };
}(jQuery));


/** jQuery function to decrement counter attached to DOM element's data attribute
 * @param {String} prop - Name of data property to be decremented
 */
(function($) {
  $.fn.decrement_counter = function(prop) {
    return this.each(function() {
      var data = $(this).data();
      if(!(prop in data)) {
        data[prop] = -1;
      }
      else {
        data[prop] -= 1;
      }
    });
  };
}(jQuery));
