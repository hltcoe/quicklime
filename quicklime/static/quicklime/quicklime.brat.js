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


/** Create and display a Serif ACE relations diagram
 * @param {String} communicationUUID
 * @param {String} sentenceUUID
 * @param {String} tokenizationUUID
 */
QL.addSerifACERelations = function(communicationUUID, sentenceUUID, tokenizationUUID) {
  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var sentence = comm.getSentenceWithUUID(sentenceUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  var sentence_text = comm.text.substring(sentence.textSpan.start, sentence.textSpan.ending);
  sentence_text = sentence_text.replace(/\n/g, " ");

  // "Set" of EntityMention uuidStrings in this tokenization where the
  // EntityMention is part of a relation
  var relationEntityMentionSet = {};

  var
    argumentIndex,
    entityMention,
    entityMentionIndex,
    entityMentionSetIndex,
    situationMention,
    situationMentionIndex,
    situationMentionList,
    situationMentionSetIndex;

  // Iterate over all SituationMentions in the Communication, record
  // which EntityMentions are in a SituationMention argumentList
  for (situationMentionSetIndex in comm.situationMentionSetList) {
    if (comm.situationMentionSetList[situationMentionSetIndex].mentionList) {
      situationMentionList = comm.situationMentionSetList[situationMentionSetIndex].mentionList;
      for (situationMentionIndex in situationMentionList) {
        situationMention = situationMentionList[situationMentionIndex];
        for (argumentIndex in situationMention.argumentList) {
          relationEntityMentionSet[situationMention.argumentList[argumentIndex].entityMentionId.uuidString] = true;
        }
      }
    }
  }

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
  // 'Serif: relations' tool that has a situationType of
  // "SituationType.STATE"
  var relationLabels = [];
  for (situationMentionSetIndex in comm.situationMentionSetList) {
    if (comm.situationMentionSetList[situationMentionSetIndex].mentionList) {
      if (comm.situationMentionSetList[situationMentionSetIndex].metadata.tool === "Serif: relations") {
        situationMentionList = comm.situationMentionSetList[situationMentionSetIndex].mentionList;
        for (situationMentionIndex in situationMentionList) {
          situationMention = situationMentionList[situationMentionIndex];
          if (situationMention.situationType === "SituationType.STATE") {
            relationLabels.push(
              [situationMention.uuid.uuidString,
               situationMention.stateType,
               [['Left', situationMention.argumentList[0].entityMentionId.uuidString],
                ['Right', situationMention.argumentList[1].entityMentionId.uuidString]]]);
          }
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

  Util.embed('ace_relations_' + tokenization.uuid.uuidString, collData, docData, webFontURLs);
};


/** Create and display an NER token tagging diagram
 * @param {String} communicationUUID
 * @param {String} sentenceUUID
 * @param {String} tokenizationUUID
 */
QL.addNERTags = function(communicationUUID, sentenceUUID, tokenizationUUID) {
  var i;

  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var sentence = comm.getSentenceWithUUID(sentenceUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  var webFontURLs = [];

  var collData = {
    entity_types: [
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
  var nerTagList = tokenization.getTokenTaggingsOfType("NER")[0];

  var ner_tag_labels = [];
  for (i = 0; i < nerTagList.taggedTokenList.length; i++) {
    var nerTag = nerTagList.taggedTokenList[i];
    var token = tokenization.tokenList.tokenList[nerTag.tokenIndex];
    var entityID = "T" + (i+1);
    if (nerTag.tag != "O" &&       // Stanford tag
        nerTag.tag != "OTHER" &&   // Serif tag
        nerTag.tag != "NONE")      // Serif tag
    {
      var start = token_offsets[nerTag.tokenIndex].start;
      var ending = token_offsets[nerTag.tokenIndex].ending;
      ner_tag_labels.push([entityID, nerTag.tag, [[start, ending]]]);
    }
  }

  var docData = { text: sentence_text, entities: ner_tag_labels };

  Util.embed('tokenization_ner_' + tokenization.uuid.uuidString, collData, docData, webFontURLs);
};


/** Create and display a POS token tagging diagram
 * @param {String} communicationUUID
 * @param {String} sentenceUUID
 * @param {String} tokenizationUUID
 */
QL.addPOSTags = function(communicationUUID, sentenceUUID, tokenizationUUID) {
  var i;

  var comm = QL.getCommunicationWithUUID(communicationUUID);
  var sentence = comm.getSentenceWithUUID(sentenceUUID);
  var tokenization = comm.getTokenizationWithUUID(tokenizationUUID);

  var webFontURLs = [];

  // Tag names and colors are copied from the BRAT configuration file for
  // Stanford NLP:
  //   brat-v1.3_Crunchy_Frog/configurations/Stanford-CoreNLP/visual.conf
  var collData = {
    entity_types: [
      // Coordination, white
      { type: 'CC', labels: ['CC', 'CC'], bgColor: '#F9F247' },

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

      // In/Out labels for POS annotation demo
      // TODO: Remove
      { type: 'In', labels: ['In', 'In'], bgColor: '#adf6a2' },
      { type: 'Out', labels: ['Out', 'Out'], bgColor: '#e4cbf6' },
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
  var posTagList = tokenization.getTokenTaggingsOfType("POS")[0];

  var pos_tag_labels = [];
  for (i = 0; i < posTagList.taggedTokenList.length; i++) {
    var posTag = posTagList.taggedTokenList[i];
    var token = tokenization.tokenList.tokenList[posTag.tokenIndex];
    var entityID = "T" + (i+1);
    var start = token_offsets[posTag.tokenIndex].start;
    var ending = token_offsets[posTag.tokenIndex].ending;
    pos_tag_labels.push([entityID, posTag.tag, [[start, ending]]]);
  }

  var docData = {
    // Our text of choice
    text     : sentence_text,
    // The entities entry holds all entity annotations
    entities : pos_tag_labels,
  };

  Util.embed(
    // id of the div element where brat should embed the visualisations
    'tokenization_pos_' + tokenization.uuid.uuidString,
    // object containing collection data
    collData,
    // object containing document data
    docData,
    // Array containing locations of the visualisation fonts
    webFontURLs
  );
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
 * @param {Communication} comm
 */
QL.addTokenizationBRATControls = function(comm) {
  /**
   * @param {MouseEvent} event
   */
  function addOrToggleNERTags(event) {
    if (QL.hasNERTags(event.data.tokenization_uuid)) {
      QL.toggleNERTags(event.data.tokenization_uuid);
    }
    else {
      QL.addNERTags(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
      $('#tokenization_ner_button_' + event.data.tokenization_uuid.uuidString).addClass('active');
      $("#tokenization_ner_container_" + event.data.tokenization_uuid.uuidString).show();
    }
  }

  /**
   * @param {MouseEvent} event
   */
  function addOrTogglePOSTags(event) {
    if (QL.hasPOSTags(event.data.tokenization_uuid)) {
      QL.togglePOSTags(event.data.tokenization_uuid);
    }
    else {
      QL.addPOSTags(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
      $('#tokenization_pos_button_' + event.data.tokenization_uuid.uuidString).addClass('active');
      $("#tokenization_pos_container_" + event.data.tokenization_uuid.uuidString).show();
    }
  }

  /**
   * @param {MouseEvent} event
   */
  function addOrToggleSerifACERelations(event) {
    if (QL.hasSerifACERelations(event.data.tokenization_uuid)) {
      QL.toggleSerifACERelations(event.data.tokenization_uuid);
    }
    else {
      QL.addSerifACERelations(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
      $('#ace_relations_button_' + event.data.tokenization_uuid.uuidString).addClass('active');
    }
  }

  /** Returns a boolean indicating if a Communication has SituationMention data from 'Serif: relations'
   * @param {Communication} comm
   * @returns {Boolean}
   */
  function commHasSerifRelationsData(comm) {
    for (var i in comm.situationMentionSetList) {
      if (comm.situationMentionSetList[i].metadata.tool === "Serif: relations") {
        return true;
      }
    }
    return false;
  }

  var hasSerifRelationsData = commHasSerifRelationsData(comm);

  for (var sectionListIndex in comm.sectionSegmentationList[0].sectionList) {
    if (comm.sectionSegmentationList[0].sectionList[sectionListIndex].sentenceSegmentationList) {
      for (var sentenceIndex in comm.sectionSegmentationList[0].sectionList[sectionListIndex].sentenceSegmentationList[0].sentenceList) {
        var sentence = comm.sectionSegmentationList[0].sectionList[sectionListIndex].sentenceSegmentationList[0].sentenceList[sentenceIndex];
        var tokenization = sentence.tokenizationList[0];

        var tokenization_controls_div = $('#tokenization_controls_' + tokenization.uuid.uuidString);

	if (tokenization.getTokenTaggingsOfType("NER").length > 0) {
          var ner_tag_button = $('<button>')
            .addClass('btn btn-default btn-xs')
            .attr('id', 'tokenization_ner_button_' + tokenization.uuid.uuidString)
            .attr('type', 'button')
            .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid},
                   addOrToggleNERTags)
            .css('margin-right', '1em')
            .html("NER");
          tokenization_controls_div.append(ner_tag_button);
	}

	if (tokenization.getTokenTaggingsOfType("POS").length > 0) {
          var pos_tag_button = $('<button>')
            .addClass('btn btn-default btn-xs')
            .attr('id', 'tokenization_pos_button_' + tokenization.uuid.uuidString)
            .attr('type', 'button')
            .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid},
                   addOrTogglePOSTags)
            .css('margin-right', '1em')
            .html("POS");
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
          tokenization_controls_div.append(relation_button);
        }
      }
    }
  }
};


/** Check if Serif ACE relations diagram has already been added to DOM
 * @param {String} tokenizationUUID
 * @returns {Boolean}
 */
QL.hasSerifACERelations = function(tokenizationUUID) {
  if ($("#ace_relations_" + tokenizationUUID.uuidString + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Check if NER token tagging diagram has already been added to DOM
 * @param {String} tokenizationUUID
 * @returns {Boolean}
 */
QL.hasNERTags = function(tokenizationUUID) {
  if ($("#tokenization_ner_" + tokenizationUUID.uuidString + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Check if POS token tagging diagram has already been added to DOM
 * @param {String} tokenizationUUID
 * @returns {Boolean}
 */
QL.hasPOSTags = function(tokenizationUUID) {
  if ($("#tokenization_pos_" + tokenizationUUID.uuidString + " svg").length > 0) {
    return true;
  }
  else {
    return false;
  }
};


/** Toggle display of Serif ACE relations diagram
 * @param {String} tokenizationUUID
 */
QL.toggleSerifACERelations = function(tokenizationUUID) {
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
 * @param {String} tokenizationUUID
 */
QL.toggleNERTags = function(tokenizationUUID) {
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
 * @param {String} tokenizationUUID
 */
QL.togglePOSTags = function(tokenizationUUID) {
  if ($("#tokenization_pos_container_" + tokenizationUUID.uuidString).css('display') == 'none') {
    $('#tokenization_pos_button_' + tokenizationUUID.uuidString).addClass('active');
    $("#tokenization_pos_container_" + tokenizationUUID.uuidString).show();
  }
  else {
    $('#tokenization_pos_button_' + tokenizationUUID.uuidString).removeClass('active');
    $("#tokenization_pos_container_" + tokenizationUUID.uuidString).hide();
  }
};
