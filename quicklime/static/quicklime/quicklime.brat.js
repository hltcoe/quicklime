QL.brat = {};

// DANGER: Monkeypatching BRAT
//
// Instead of monkeypatching, we could modify the local copy of the
// BRAT source, but that makes merging changes from the BRAT Git repo
// a little more difficult.

// Prevent BRAT from trying to load webfonts by disabling two
// functions in the Util module from 'brat/client/src/util.js'.
Util.areFontsLoaded = function() { return true; };
Util.loadFonts = function(webFontURLs, dispatcher) { };

// The BRAT visualizer.js script tries to detect the Chrome browser
// using:
//   $.browser.chrome
//
// but jQuery's browser function has been deprecated since jQuery 1.3,
// and was removed in jQuery 1.9:
//   http://jquery.com/upgrade-guide/1.9/#jquery-browser-removed
//
// We set $.browser to an empty object, so that $.browser.chrome
// evaluates to undefined instead of generating an error message.
$.browser = {};



QL.brat.SERIF_RELATIONS = "Serif: relations";


/** Create and display a Serif ACE relations diagram
 *
 *  While the NER and POS diagrams use the token strings from
 *  Token.text, the Serif ACE relations diagram [currently] uses the
 *  token strings specified by the string offsets in Token.textSpan.
 *
 * @param {concrete.UUID} communicationUUID
 * @param {concrete.UUID} sentenceUUID
 * @param {concrete.UUID} tokenizationUUID
 */
QL.brat.addSerifACERelations = function(communicationUUID, sentenceUUID, tokenizationUUID) {
  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var sentence = comm.getSentenceWithUUID(sentenceUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  var sentence_text = comm.text.substring(sentence.textSpan.start, sentence.textSpan.ending);
  sentence_text = sentence_text.replace(/\n/g, " ");

  // "Set" of EntityMention uuidStrings where the EntityMention is part of a SituationMention
  // created by Serif Relations
  var relationEntityMentionSet = QL.brat.getRelationEntityMentionSet(comm, QL.brat.SERIF_RELATIONS);

  var
    argumentIndex,
    entityMention,
    entityMentionIndex,
    entityMentionSetIndex,
    situationMention,
    situationMentionIndex,
    situationMentionList,
    situationMentionSetIndex;

  // Iterate over all EntityMentions in the Communication, create
  // 'BRAT entity labels' for any EntityMention that is in the
  // specified Tokenization and also in a SituationMention
  // argumentList
  var relationEntityLabels = [];
  for (entityMentionSetIndex in comm.entityMentionSetList) {
    if (comm.entityMentionSetList[entityMentionSetIndex].mentionList) {
      for (entityMentionIndex in comm.entityMentionSetList[entityMentionSetIndex].mentionList) {
        entityMention = comm.entityMentionSetList[entityMentionSetIndex].mentionList[entityMentionIndex];
        if (entityMention.tokens.tokenizationId.uuidString === tokenizationUUID.uuidString) {
          if (entityMention.uuid.uuidString in relationEntityMentionSet) {
            var start = entityMention.tokens.textSpan.start - sentence.textSpan.start;
            var ending = entityMention.tokens.textSpan.ending - sentence.textSpan.start;
            relationEntityLabels.push(
              [entityMention.uuid.uuidString,
               entityMention.entityType,
               [[start, ending]]]);
          }
        }
      }
    }
  }

  // Iterate over all SituationMentions in a Communication, create
  // 'BRAT relation labels' for any SituationMention created by the
  // Serif Relations tool that has a situationType of
  // "SituationType.STATE"
  var relationLabels = [];
  for (situationMentionSetIndex in comm.situationMentionSetList) {
    if (comm.situationMentionSetList[situationMentionSetIndex].mentionList) {
      if (comm.situationMentionSetList[situationMentionSetIndex].metadata.tool === QL.brat.SERIF_RELATIONS) {
        situationMentionList = comm.situationMentionSetList[situationMentionSetIndex].mentionList;
        for (situationMentionIndex in situationMentionList) {
          situationMention = situationMentionList[situationMentionIndex];
          relationLabels.push(
            [situationMention.uuid.uuidString,
             situationMention.situationType,
             [['Left', situationMention.argumentList[0].entityMentionId.uuidString],
              ['Right', situationMention.argumentList[1].entityMentionId.uuidString]]]);
        }
      }
    }
  }

  var collData = {
    entity_types: [
      // The 'type' field must be a string, and not a number.
      //
      // getArcLabels() in 'brat/client/src/util.js' invokes the match()
      // function on the object passed in as the 'type' field:
      //   var splitType = arcType.match(/^(.*?)(\d*)$/);
      // and an error will occur if that object is a number.
      { type: 'Crime', labels: ['CRI', 'Crime'], bgColor: 'darkgray' },
      { type: 'FAC', labels: ['FAC', 'Facility'], bgColor: '#aaaaee' },
      { type: 'GPE', labels: ['GPE', 'Geo-Political Entity'], bgColor: '#7fe2ff' },
      { type: 'Job-Title', labels: ['JT', 'Job Title'], bgColor: '#F9F247' },
      { type: 'LOC', labels: ['LOC', 'Location'], bgColor: '#6fffdf' },
      { type: 'ORG', labels: ['ORG', 'Organization'], bgColor: '#8fb2ff' },
      { type: 'PER', labels: ['PER', 'Person'], bgColor: '#ffccaa' },
      { type: 'TIMEX2.TIME', labels: ['TIME', 'Time'], bgColor: '#F9F247' },
      { type: 'VEH', labels: ['VEH', 'Vehicle'], bgColor: '#ccccee' },
      { type: 'WEA', labels: ['WEA', 'Weaopn'], bgColor: 'darkgray' },
    ],
    relation_types: [
      // The values of the 'type' strings below come from Serif
      {
        type: 'ART.User-Owner-Inventor-Manufacturer',
        labels: ['Owned by', 'Owner/Inventor/Manufacturer'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'GEN-AFF.Org-Location',
        labels: ['Located at', 'Organization Location'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'ORG-AFF.Employment',
        labels: ['Employed by', 'Organization Affiliation - Employment'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'ORG-AFF.Membership',
        labels: ['Member of', 'Organization Affiliation - Member'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'PART-WHOLE.Geographical',
        labels: ['Located in', 'Geographical part/whole'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'PART-WHOLE.Subsidiary',
        labels: ['Part', 'Part of Whole'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'PER-SOC.Business',
        labels: ['Business with', 'Business Relationship'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'PER-SOC.Family',
        labels: ['Family of', 'Family Relationship'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'PHYS.Located',
        labels: ['Loc', 'Located in'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
      {
        type: 'PHYS.Near',
        labels: ['Near', 'Near'],
        color: '#e30834',
        dashArray: '3-3',
        args: [ { role: 'Left', targets: ['1','2','3','4','6','7','8','9','10','12'] },
                { role: 'Right', targets: ['1','2','3','4','6','7','8','9','10','12'] } ],
      },
    ],
  };

  var docData = {
    text     : sentence_text,
    entities : relationEntityLabels,
    relations: relationLabels,
  };

  var webFontURLs = [];

  var brat_container_id = 'ace_relations_' + tokenization.uuid.uuidString;

  Util.embed(brat_container_id, collData, docData, webFontURLs);
};


/** Create and display an NER token tagging diagram
 * @param {concrete.UUID} communicationUUID
 * @param {concrete.UUID} sentenceUUID
 * @param {concrete.UUID} tokenizationUUID
 */
QL.brat.addNERTags = function(communicationUUID, sentenceUUID, tokenizationUUID) {
  var i;

  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var sentence = comm.getSentenceWithUUID(sentenceUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  var webFontURLs = [];

  var collData = {
    entity_types: [
      /*
      { type: 'DATE', labels: ['Date', 'Date'], bgColor: '#9affe6' },
      { type: 'DURATION', labels: ['Duration', 'Dur'], bgColor: '#9affe6' },
      { type: 'LOCATION', labels: ['Location', 'Loc'], bgColor: '#95dfff' },
      { type: 'MISC', labels: ['Misc', 'Misc'], bgColor: '#f1f447' },
      { type: 'NUMBER', labels: ['Number', 'Num'], bgColor: '#df99ff' },
      { type: 'ORGANIZATION', labels: ['Organization', 'Org'], bgColor: '#8fb2ff' },
      { type: 'PERCENT', labels: ['Percent', 'Perc'], bgColor: '#ffa22b' },
      { type: 'PERSON', labels: ['Person', 'Pers'], bgColor: '#ffccaa' },
      { type: 'SET', labels: ['Set', 'Set'], bgColor: '#ff7c95' },
      { type: 'TIME', labels: ['Time', 'Time'], bgColor: '#9affe6' },
      */
      { type: 'GPE', labels: ['GPE', 'GPE'], bgColor: '#ff7c95' },
      { type: 'ORG', labels: ['ORG', 'ORG'], bgColor: '#8fb2ff' },
      { type: 'NONE', labels: ['NONE', 'NONE'], bgColor: '#ffffff'},
      { type: 'PER', labels: ['PER', 'PER'], bgColor: '#ffccaa' },
      { type: 'VEH', labels: ['VEH', 'VEH'], bgColor: '#df99ff' },
    ]
  };

  var sentence_text = "";
  var token_offsets = [];
  for (i = 0, total_tokens = tokenization.tokenList.tokenList.length; i < total_tokens; i++) {
    token_offsets.push({
      'start': sentence_text.length,
      'ending': sentence_text.length + tokenization.tokenList.tokenList[i].text.length
    });
    sentence_text += tokenization.tokenList.tokenList[i].text + " ";
  }

  // For now, we assume that there is only a single NER tagging
  var nerTokenTagging = tokenization.getTokenTaggingsOfType("NER")[0];

  var ner_tag_labels = [], start, ending;
  for (i = 0; i < nerTokenTagging.taggedTokenList.length; i++) {
    var nerTag = nerTokenTagging.taggedTokenList[i];
    var token = tokenization.tokenList.tokenList[nerTag.tokenIndex];
    var entityID = "T" + nerTag.tokenIndex;
    if (nerTag.tag != "O" &&       // Stanford tag
        nerTag.tag != "OTHER" &&   // Serif tag
        nerTag.tag != "NONE")      // Serif tag
    {
      start = token_offsets[nerTag.tokenIndex].start;
      ending = token_offsets[nerTag.tokenIndex].ending;
      ner_tag_labels.push([entityID, nerTag.tag, [[start, ending]]]);
    }
    else if (token.text != "." &&
             token.text != "," &&
             token.text != "?" &&
             token.text != "!" &&
             token.text != "``" &&
             token.text != "''")
    {
      // Create "empty" NER label for tokens that are not punctuation
      start = token_offsets[nerTag.tokenIndex].start;
      ending = token_offsets[nerTag.tokenIndex].ending;
      ner_tag_labels.push([entityID, "___", [[start, ending]]]);
    }
  }

  var docData = {
    text: sentence_text,
    entities: ner_tag_labels
  };

  var brat_container_id = 'tokenization_ner_' + tokenization.uuid.uuidString;

  var showNERPopover = function(event) {
    QL.brat.showTokenTaggingPopover(event, brat_container_id, collData);
  };

  var dispatcher = Util.embed(brat_container_id, collData, docData, webFontURLs);

  dispatcher.on('click', showNERPopover);

  $('#' + brat_container_id).on(
    'click',
    'span.token_label',
    { tokenTagging: nerTokenTagging },
    QL.brat.updateTokenLabel
  );
};


/** Create and display a POS token tagging diagram
 * @param {concrete.UUID} communicationUUID
 * @param {concrete.UUID} sentenceUUID
 * @param {concrete.UUID} tokenizationUUID
 */
QL.brat.addPOSTags = function(communicationUUID, sentenceUUID, tokenizationUUID) {
  var i;

  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var sentence = comm.getSentenceWithUUID(sentenceUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  var webFontURLs = [];

  // Tag names and colors are copied from the BRAT configuration file for
  // Stanford NLP:
  //   brat-v1.3_Crunchy_Frog/configurations/Stanford-CoreNLP/visual.conf
  var colors = {
    blue: '#a4bced',
    brownish: '#ffe8be',
    green: '#adf6a2',
    greyish_blue: '#ccdaf6',
    light_grey: '#e3e3e3',
    violet: '#e4cbf6',
    yellowish: '#fffda8',
    white: '#ffffff'
  };
  var collData = {
    entity_types: [
      { type: 'CC', labels: ['CC', 'CC'], bgColor: '#F9F247' },
      { type: 'CD', labels: ['CD', 'CD'], bgColor: colors.greyish_blue },
      { type: 'DATE-NNP', labels: ['NNP', 'NNP'], bgColor: colors.blue },
      { type: 'DT', labels: ['DT', 'DT'], bgColor: colors.greyish_blue },
      { type: 'EX', labels: ['EX', 'EX'], bgColor: colors.violet },
      { type: 'FW', labels: ['FW', 'FW'], bgColor: colors.violet },
      { type: 'IN', labels: ['IN', 'IN'], bgColor: colors.brownish },
      { type: 'JJ', labels: ['JJ', 'JJ'], bgColor: colors.yellowish },
      { type: 'JJR', labels: ['JJR', 'JJR'], bgColor: colors.yellowish },
      { type: 'JJS', labels: ['JJS', 'JJS'], bgColor: colors.yellowish },
      { type: 'LS', labels: ['LS', 'LS'], bgColor: colors.violet },
      { type: 'MD', labels: ['MD', 'MD'], bgColor: colors.green },
      { type: 'NN', labels: ['NN', 'NN'], bgColor: colors.blue },
      { type: 'NNP', labels: ['NNP', 'NNP'], bgColor: colors.blue },
      { type: 'NNPS', labels: ['NNPS', 'NNPS'], bgColor: colors.blue },
      { type: 'NNS', labels: ['NNS', 'NNS'], bgColor: colors.blue },
      { type: 'PDT', labels: ['PDT', 'PDT'], bgColor: colors.greyish_blue },
      { type: 'POS', labels: ['POS', 'POS'], bgColor: colors.violet },
      { type: 'PRP', labels: ['PRP', 'PRP'], bgColor: colors.greyish_blue },
      { type: 'PRP__DOLLAR__', labels: ['PRP$', 'PRP$'], bgColor: colors.greyish_blue },
      { type: 'RB', labels: ['RB', 'RB'], bgColor: colors.yellowish },
      { type: 'RBR', labels: ['RBR', 'RBR'], bgColor: colors.yellowish },
      { type: 'RBS', labels: ['RBS', 'RBS'], bgColor: colors.yellowish },
      { type: 'RP', labels: ['RP', 'RP'], bgColor: colors.violet },
      { type: 'SYM', labels: ['SYM', 'SYM'], bgColor: colors.violet },
      { type: 'TO', labels: ['TO', 'TO'], bgColor: colors.brownish },
      { type: 'UH', labels: ['UH', 'UH'], bgColor: colors.violet },
      { type: 'VB', labels: ['VB', 'VB'], bgColor: colors.green },
      { type: 'VBD', labels: ['VBD', 'VBD'], bgColor: colors.green },
      { type: 'VBG', labels: ['VBG', 'VBG'], bgColor: colors.green },
      { type: 'VBN', labels: ['VBN', 'VBN'], bgColor: colors.green },
      { type: 'VBP', labels: ['VBP', 'VBP'], bgColor: colors.green },
      { type: 'VBZ', labels: ['VBZ', 'VBZ'], bgColor: colors.green },
      { type: 'WDT', labels: ['WDT', 'WDT'], bgColor: colors.greyish_blue },
      { type: 'WP', labels: ['WP', 'WP'], bgColor: colors.greyish_blue },
      { type: 'WP__DOLLAR__', labels: ['WP$', 'WP$'], bgColor: colors.greyish_blue },
      { type: 'WRB', labels: ['WRB', 'WRB'], bgColor: colors.yellowish },

      { type: '__DOLLAR__', labels: ['$', '$'], bgColor: colors.white },
      { type: '?', labels: ['?', '?'], bgColor: colors.white },
      { type: '.', labels: ['.', '.'], bgColor: colors.white },
      { type: ',', labels: [',', ','], bgColor: colors.white },
      { type: '``', labels: ['``', '``'], bgColor: colors.white },
      { type: "''", labels: ["''", "''"], bgColor: colors.white },
    ]
  };

  var sentence_text = "";
  var token_offsets = [];
  for (i = 0, total_tokens = tokenization.tokenList.tokenList.length; i < total_tokens; i++) {
    token_offsets.push({
      'start': sentence_text.length,
      'ending': sentence_text.length + tokenization.tokenList.tokenList[i].text.length
    });
    sentence_text += tokenization.tokenList.tokenList[i].text + " ";
  }

  // For now, we assume that there is only a single POS tagging
  var posTokenTagging = tokenization.getTokenTaggingsOfType("POS")[0];

  var pos_tag_labels = [];
  for (i = 0; i < posTokenTagging.taggedTokenList.length; i++) {
    var posTag = posTokenTagging.taggedTokenList[i];
    var token = tokenization.tokenList.tokenList[posTag.tokenIndex];
    var entityID = "T" + posTag.tokenIndex;
    var start = token_offsets[posTag.tokenIndex].start;
    var ending = token_offsets[posTag.tokenIndex].ending;
    pos_tag_labels.push([entityID, posTag.tag, [[start, ending]]]);
  }

  var docData = {
    text     : sentence_text,
    entities : pos_tag_labels,
  };

  var brat_container_id = 'tokenization_pos_' + tokenization.uuid.uuidString;

  var showPOSPopover = function(event) {
    QL.brat.showTokenTaggingPopover(event, brat_container_id, collData);
  };

  var dispatcher = Util.embed(brat_container_id, collData, docData, webFontURLs);

  dispatcher.on('click', showPOSPopover);

  $('#' + brat_container_id).on(
    'click',
    'span.token_label',
    { tokenTagging: posTokenTagging },
    QL.brat.updateTokenLabel
  );
};


/** Create and display a SituationMention visualization
 * @param {String} container_id - DOM ID of element the visualization should be added to
 * @param {concrete.Communication} comm
 * @param {concrete.situationMention} situationMention
 */
QL.brat.addSituationMention = function(container_id, comm, situationMention) {
  function getSpanForTokenRefSequence(tokenRefSequence, characterOffset) {
    if (tokenRefSequence.textSpan) {
      return tokenRefSequence.textSpan;
    }
    else {
      // TODO: Don't assume token indices are sorted, handle non-contiguous tokens
      var tokenization = comm.getTokenizationWithUUID(tokenRefSequence.tokenizationId);
      var first_token = tokenization.tokenList.tokenList[tokenRefSequence.tokenIndexList[0]];
      var tokens_in_sequence = tokenRefSequence.tokenIndexList.length;
      var last_token = tokenization.tokenList.tokenList[tokenRefSequence.tokenIndexList[tokens_in_sequence-1]];
      if (first_token.textSpan && last_token.textSpan) {
        return { start: first_token.textSpan.start, ending: last_token.textSpan.ending };
      }
      else {
        return { start: characterOffset, ending: characterOffset };
      }
    }
  }

  function getSpanForSituationMention(situationMention, characterOffset) {
    if (situationMention.tokens) {
      if (situationMention.tokens.textSpan) {
        return situationMention.tokens.textSpan;
      }
      else {
        return getSpanForTokenRefSequence(situationMention.tokens, characterOffset);
      }
    }
    else {
      return { start: characterOffset, ending: characterOffset };
    }
  }

  function getLabelForSituationMention(situationMention) {
    if (situationMention.text) {
      return situationMention.situationType + ': ' + situationMention.text;
    }
    else if (situationMention.situationType) {
      return situationMention.situationType;
    }
    else {
      return "NO_LABEL";
    }
  }

  var tokenizationIds = QL.getSituationMentionTokenizationIds(comm, situationMention);
  if (tokenizationIds.length === 1) {
    var i;
    var tokenization = comm.getTokenizationWithUUID(tokenizationIds[0]);
    var sentence = tokenization.sentence;
    var characterOffset = sentence.textSpan.start;

    var collData = {
      entity_types: [
      ]
    };

    var sentence_text = comm.text.substring(sentence.textSpan.start, sentence.textSpan.ending);
    sentence_text = sentence_text.replace(/\n/g, " ");

    var relationEntityLabels = [];
    var relationLabels = [];

    // Add entity label for the SituationMention
    var situationMentionSpan = getSpanForSituationMention(situationMention, characterOffset);
    relationEntityLabels.push(
      [situationMention.uuid.uuidString,
       getLabelForSituationMention(situationMention),
       [[situationMentionSpan.start - characterOffset,
         situationMentionSpan.ending - characterOffset]]]);

    // Add entity label(s) for the SituationMention's argument(s)
    for (var argumentIndex in situationMention.argumentList) {
      var argument = situationMention.argumentList[argumentIndex];
      if (argument.entityMentionId) {
        var entityMentionArgument = comm.getEntityMentionWithUUID(argument.entityMentionId);
        var entityMentionArgumentSpan = getSpanForTokenRefSequence(entityMentionArgument.tokens, characterOffset);
        var entityTypeLabel = entityMentionArgument.entityType ? entityMentionArgument.entityType : "UNKNOWN_TYPE";
        relationEntityLabels.push(
          [entityMentionArgument.uuid.uuidString,
           entityTypeLabel,
           [[entityMentionArgumentSpan.start - characterOffset,
             entityMentionArgumentSpan.ending - characterOffset]]]);
        var argumentRoleLabel = argument.role ? argument.role : "UNKNOWN_ROLE";
        relationLabels.push(
          ['argument_' + argumentIndex,
           argumentRoleLabel,
           [['SM', situationMention.uuid.uuidString],
            ['ARG', entityMentionArgument.uuid.uuidString]]]);
      }
      else if (argument.situationMentionId) {
        var situationMentionArgument = comm.getSituationMentionWithUUID(argument.situationMentionId);
        var situationMentionArgumentSpan = getSpanForSituationMention(situationMentionArgument, characterOffset);
        relationEntityLabels.push(
          [situationMentionArgument.uuid.uuidString,
           getLabelForSituationMention(situationMentionArgument),
           [[situationMentionArgumentSpan.start - characterOffset,
             situationMentionArgumentSpan.ending - characterOffset]]]);
        relationLabels.push(
          ['argument_' + argumentIndex,
           argument.role,
           [['SM', situationMention.uuid.uuidString],
            ['ARG', situationMentionArgument.uuid.uuidString]]]);
      }
    }

    var docData = {
      text: sentence_text,
      entities: relationEntityLabels,
      relations: relationLabels,
    };

    var webFontURLs = [];

    Util.embed(container_id, collData, docData, webFontURLs);
  }
};


/** Add buttons for toggling display of BRAT visualizations
 *
 *  The buttons are appended to the 'tokenization_controls' <div> for
 *  the respective Tokenizatin.
 *
 *  The '+' button indicates which objects are added to the DOM:
 *     <div class="tokenization_controls" id="tokenization_controls_[TOKENIZATION_UUID]">
 *   +   <button id="tokenization_ner_button_[TOKENIZATION_UUID]">
 *   +   <button id="tokenization_pos_button_[TOKENIZATION_UUID]">
 *   +   <button id="ace_relations_button_[TOKENIZATION_UUID]">
 *   +   ...
 *
 * @param {concrete.Communication} comm
 */
QL.brat.addTokenizationBRATControls = function(comm) {
  /** Event handler for toggling an NER token tagging diagram
   * @param {MouseEvent} event
   */
  function addOrToggleNERTags(event) {
    if (QL.brat.hasNERTags(event.data.tokenization_uuid)) {
      QL.brat.toggleNERTags(event.data.tokenization_uuid);
    }
    else {
      QL.brat.addNERTags(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
      $('#tokenization_ner_button_' + event.data.tokenization_uuid.uuidString).addClass('active');
      $("#tokenization_ner_container_" + event.data.tokenization_uuid.uuidString).show();
    }
  }

  /** Event handler for toggling a POS token tagging diagram
   * @param {MouseEvent} event
   */
  function addOrTogglePOSTags(event) {
    if (QL.brat.hasPOSTags(event.data.tokenization_uuid)) {
      QL.brat.togglePOSTags(event.data.tokenization_uuid);
    }
    else {
      QL.brat.addPOSTags(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
      $('#tokenization_pos_button_' + event.data.tokenization_uuid.uuidString).addClass('active');
      $("#tokenization_pos_container_" + event.data.tokenization_uuid.uuidString).show();
    }
  }

  /** Event handler for toggling a Serif ACE relations diagram
   * @param {MouseEvent} event
   */
  function addOrToggleSerifACERelations(event) {
    if (QL.brat.hasSerifACERelations(event.data.tokenization_uuid)) {
      QL.brat.toggleSerifACERelations(event.data.tokenization_uuid);
    }
    else {
      QL.brat.addSerifACERelations(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
      $('#ace_relations_button_' + event.data.tokenization_uuid.uuidString).addClass('active');
    }
  }

  /** Returns a boolean iff a Communication has SituationMention data from the specified tool
   * @param {concrete.Communication} comm
   * @param {String} toolname
   * @returns {Boolean}
   */
  function commHasSituationMentionData(comm, toolname) {
    for (var i in comm.situationMentionSetList) {
      if (comm.situationMentionSetList[i].metadata.tool === toolname) {
        return true;
      }
    }
    return false;
  }

  /** Get a flat array of all Tokenization objects in the Communication
   * @param {concrete.Communication} comm
   * @returns {Array} The Tokenization objects
   */
  function getAllTokenizations(comm) {
    var tokenizations = [];

    for (var sectionIndex in comm.sectionList) {
      for (var sentenceIndex in comm.sectionList[sectionIndex].sentenceList) {
        var sentence = comm.sectionList[sectionIndex].sentenceList[sentenceIndex];
        tokenizations.push(sentence.tokenization);
      }
    }
    return tokenizations;
  }

  /** Get the Tokenizations that contain EntityMentions that are part of
   *  a SituationMention created by the specified tool
   *
   * @param {concrete.Communication} comm
   * @param {String} toolname - Name of tool that created the SituationMentions
   * @returns {Object} Object keys are uuidStrings of matching Tokenizations
   */
  function getTokenizationsWithSituationMentions(comm, toolname) {
    var tokenizationsWithSerifRelations = {};
    var relationEntityMentionSet = QL.brat.getRelationEntityMentionSet(comm, toolname);

    for (var entityMentionSetIndex in comm.entityMentionSetList) {
      if (comm.entityMentionSetList[entityMentionSetIndex].mentionList) {
        for (var entityMentionIndex in comm.entityMentionSetList[entityMentionSetIndex].mentionList) {
          entityMention = comm.entityMentionSetList[entityMentionSetIndex].mentionList[entityMentionIndex];
          if (entityMention.uuid.uuidString in relationEntityMentionSet) {
            tokenizationsWithSerifRelations[entityMention.tokens.tokenizationId.uuidString] = true;
          }
        }
      }
    }
    return tokenizationsWithSerifRelations;
  }

  var hasSerifRelationsData = commHasSituationMentionData(comm, QL.brat.SERIF_RELATIONS);
  var tokenizationsWithSerifRelations = getTokenizationsWithSituationMentions(comm, QL.brat.SERIF_RELATIONS);

  for (var sectionIndex in comm.sectionList) {
    var section = comm.sectionList[sectionIndex];
    if (section.sentenceList) {
      for (var sentenceIndex in section.sentenceList) {
        var sentence = section.sentenceList[sentenceIndex];
        var tokenization = sentence.tokenization;

        var tokenization_controls_div = $('#tokenization_controls_' + tokenization.uuid.uuidString);

        var NERtokenTaggings = tokenization.getTokenTaggingsOfType("NER");
        if (NERtokenTaggings.length > 0) {
          var ner_tag_button = $('<button>')
            .addClass('btn btn-default btn-xs')
            .attr('id', 'tokenization_ner_button_' + tokenization.uuid.uuidString)
            .attr('type', 'button')
            .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid},
                   addOrToggleNERTags)
            .css('margin-right', '1em')
            .html("NER");
          // We currently ignore all but the first NER TokenTagging
          QL.addMetadataTooltip(ner_tag_button, NERtokenTaggings[0].metadata);
          tokenization_controls_div.append(ner_tag_button);
        }

        var POStokenTaggings = tokenization.getTokenTaggingsOfType("POS");
        if (POStokenTaggings.length > 0) {
          var pos_tag_button = $('<button>')
            .addClass('btn btn-default btn-xs')
            .attr('id', 'tokenization_pos_button_' + tokenization.uuid.uuidString)
            .attr('type', 'button')
            .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid},
                   addOrTogglePOSTags)
            .css('margin-right', '1em')
            .html("POS");
          // We currently ignore all but the first POS TokenTagging
          QL.addMetadataTooltip(pos_tag_button, POStokenTaggings[0].metadata);
          tokenization_controls_div.append(pos_tag_button);
        }

        if (hasSerifRelationsData) {
          var relation_button = $('<button>')
            .addClass('btn btn-default btn-xs')
            .attr('id', 'ace_relations_button_' + tokenization.uuid.uuidString)
            .attr('type', 'button')
            .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid},
                   addOrToggleSerifACERelations)
            .css('margin-right', '1em')
            .html("Rel");
          if (!tokenizationsWithSerifRelations[tokenization.uuid.uuidString]) {
            relation_button.prop('disabled', true);
          }
          tokenization_controls_div.append(relation_button);
        }
      }
    }
  }
};


/** Iterate over all SituationMentions in the Communication, record
 *  which EntityMentions are in a SituationMention argumentList created
 *  by the specified toolname
 *
 * @param {concrete.Communication} comm
 * @param {String} toolname
 * @returns {Object} An object whose keys are the uuidStrings for relevant EntityMentions
 */
QL.brat.getRelationEntityMentionSet = function(comm, toolname) {
  var relationEntityMentionSet = {};

  for (var situationMentionSetIndex in comm.situationMentionSetList) {
    if (comm.situationMentionSetList[situationMentionSetIndex].mentionList) {
      if (comm.situationMentionSetList[situationMentionSetIndex].metadata.tool === toolname) {
        situationMentionList = comm.situationMentionSetList[situationMentionSetIndex].mentionList;
        for (var situationMentionIndex in situationMentionList) {
          situationMention = situationMentionList[situationMentionIndex];
          for (var argumentIndex in situationMention.argumentList) {
            relationEntityMentionSet[situationMention.argumentList[argumentIndex].entityMentionId.uuidString] = true;
          }
        }
      }
    }
  }
  return relationEntityMentionSet;
};


/** Check if Serif ACE relations diagram has already been added to DOM
 * @param {concrete.UUID} tokenizationUUID
 * @returns {Boolean}
 */
QL.brat.hasSerifACERelations = function(tokenizationUUID) {
  if ($("#ace_relations_" + tokenizationUUID.uuidString + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Check if NER token tagging diagram has already been added to DOM
 * @param {concrete.UUID} tokenizationUUID
 * @returns {Boolean}
 */
QL.brat.hasNERTags = function(tokenizationUUID) {
  if ($("#tokenization_ner_" + tokenizationUUID.uuidString + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Check if POS token tagging diagram has already been added to DOM
 * @param {concrete.UUID} tokenizationUUID
 * @returns {Boolean}
 */
QL.brat.hasPOSTags = function(tokenizationUUID) {
  if ($("#tokenization_pos_" + tokenizationUUID.uuidString + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Create a popover TokenTagging menu when clicking on labels in BRAT visualization
 *
 * NOTE: QL.brat.showTokenTaggingPopover() and QL.brat.updateTokenLabel() are tightly coupled
 *
 * @param {MouseEvent} event
 * @param {String} brat_container_id - DOM ID of element containing the BRAT SVG
 * @param {Object} collData - Collection data in the format used by BRAT's Util.embed()
 */
QL.brat.showTokenTaggingPopover = function(event, brat_container_id, collData) {
  /* The SVG DOM for the BRAT labels looks like:
   *
   *   <g class="span">
   *     <rect x="9.5" y="-30.75" width="24.84000015258789"
   *        height="10.765625" class="span_NNP span_default" fill="#a4bced"
   *        stroke="#000000" rx="2" ry="1" data-span-id="T2"
   *        data-fragment-id="0"></rect>
   *     <text x="22.5" y="-22.25" fill="#000000">NNP</text>
   *     <path d="M0,-14.984375C0,-18.984375
   *        22.5,-14.984375 22.5,-18.984375C22.5,-14.984375
   *        44.36279296875,-18.984375 44.36279296875,-14.984375"
   *        class="curly" stroke="#1a3d85"></path>
   *   </g>
   *
   * where the <rect> is the colored box, the <text> is the actual
   * token text, the <path> is the "curly bracket" that goes from the
   * colored box to the word that is being labeled.
   */

  var target = $(event.target);

  var brat_span = target.parent('g.span');
  if (brat_span) {
    var text = brat_span.find('text');
    if (text && text[0]) {
      // data_span_id is created by concatenating 'T' with the token index, e.g. 'T0', 'T1'
      var data_span_id = target.attr('data-span-id');
      var token_index = parseInt(data_span_id.slice(1), 10);

      var popover_html = '<div class="token_label_container" data-span-id="' + data_span_id +
        '" data-token-index="' + token_index + '">';
      for (var i=0, l=collData.entity_types.length; i < l; i++) {
        var label_text = collData.entity_types[i].labels[0];
        var label_color = collData.entity_types[i].bgColor;
        popover_html += '<span class="token_label" style="background-color: ' + label_color + '">' + label_text + '</span> ';
      }
      popover_html += '</div>';

      // Bootstrap adds the 'aria-describedby' attribute when we create a popover
      var current_popover_id = text.attr('aria-describedby');
      if (current_popover_id) {
        // Destroy all popovers for this SVG container EXCEPT popover for current text element
        $('#' + brat_container_id + ' .popup').each(function() {
          if ($(this).id !== current_popover_id) {
            $(this).popover('destroy');
          }
        });
      }
      else {
        // Destroy all popovers for this SVG container
        $('#' + brat_container_id + ' text').popover('destroy');
      }

      // We must specify a container for the popover that is outside
      // of the <svg> element - otherwise, Bootstrap will try to
      // insert the DOM element for the popover in the SVG container
      // after the <text> element, and the tooltip will not be
      // displayed.
      text.popover({
        container: '#'+brat_container_id,
        content: popover_html,
        html: true,
        placement: 'top'
      });

      text.popover('toggle');
    }
  }
};


/** Toggle display of Serif ACE relations diagram
 * @param {concrete.UUID} tokenizationUUID
 */
QL.brat.toggleSerifACERelations = function(tokenizationUUID) {
  if ($("#ace_relations_" + tokenizationUUID.uuidString).css('display') == 'none') {
    $('#ace_relations_button_' + tokenizationUUID.uuidString).addClass('active');
    $("#ace_relations_" + tokenizationUUID.uuidString).show();
  }
  else {
    $('#ace_relations_button_' + tokenizationUUID.uuidString).removeClass('active');
    $("#ace_relations_" + tokenizationUUID.uuidString).hide();
  }
};


/** Toggle display of NER token tagging diagram
 * @param {concrete.UUID} tokenizationUUID
 */
QL.brat.toggleNERTags = function(tokenizationUUID) {
  if ($("#tokenization_ner_container_" + tokenizationUUID.uuidString).css('display') == 'none') {
    $('#tokenization_ner_button_' + tokenizationUUID.uuidString).addClass('active');
    $("#tokenization_ner_container_" + tokenizationUUID.uuidString).show();
  }
  else {
    $('#tokenization_ner_button_' + tokenizationUUID.uuidString).removeClass('active');
    $("#tokenization_ner_container_" + tokenizationUUID.uuidString).hide();
  }
};


/** Toggle display of POS token tagging diagram
 * @param {concrete.UUID} tokenizationUUID
 */
QL.brat.togglePOSTags = function(tokenizationUUID) {
  if ($("#tokenization_pos_container_" + tokenizationUUID.uuidString).css('display') == 'none') {
    $('#tokenization_pos_button_' + tokenizationUUID.uuidString).addClass('active');
    $("#tokenization_pos_container_" + tokenizationUUID.uuidString).show();
  }
  else {
    $('#tokenization_pos_button_' + tokenizationUUID.uuidString).removeClass('active');
    $("#tokenization_pos_container_" + tokenizationUUID.uuidString).hide();
  }
};


/** Update a TokenTag in response to clicking on a menu created by QL.brat.showTokenTaggingPopover()
 *
 * NOTE: QL.brat.showTokenTaggingPopover() and QL.brat.updateTokenLabel() are tightly coupled
 *
 * @param {MouseEvent} event - This event must have a data.tokenTagging field that
 *                             points to a Concrete TokenTagging instance
 */
QL.brat.updateTokenLabel = function(event) {
  var token_label_container = $(event.target).parent('div.token_label_container');
  var data_span_id = token_label_container.attr('data-span-id');
  var token_index = parseInt(token_label_container.attr('data-token-index'), 10);
  var token_label = $(this).text();

  var tagged_token = event.data.tokenTagging.getTaggedTokenWithTokenIndex(token_index);
  if (tagged_token) {
    tagged_token.tag = token_label;
  }

  // BRAT attaches the 'data-span-id' attribute to the <rect>
  var brat_span_rect = $('rect[data-span-id="' + data_span_id + '"]');

  var brat_span = brat_span_rect.parent('g.span');
  if (brat_span) {
    var text = brat_span.find('text');
    if (text && text[0]) {
      var text_width_0 = text.width();

      // Update text shown in SVG canvas
      text[0].textContent = token_label;

      // Update width, horizontal position of SVG rectangle for updated text
      var dtw = text.width() - text_width_0;
      brat_span_rect.attr('width', parseInt(brat_span_rect.attr('width'), 10) + dtw);
      brat_span_rect.attr('x', parseInt(brat_span_rect.attr('x'), 10) - dtw / 2);

      // Update color of SVG rectangle to match color of menu label
      brat_span_rect.attr('fill', $(this).css('background-color'));
    }
  }
};
