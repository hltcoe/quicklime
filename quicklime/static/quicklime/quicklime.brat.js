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



QL.SERIF_RELATIONS = "Serif: relations";


/** Create and display a Serif ACE relations diagram
 *
 *  While the NER and POS diagrams use the token strings from
 *  Token.text, the Serif ACE relations diagram [currently] uses the
 *  token strings specified by the string offsets in Token.textSpan.
 *
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

  // "Set" of EntityMention uuidStrings where the EntityMention is part of a SituationMention
  // created by Serif Relations
  var relationEntityMentionSet = QL.getRelationEntityMentionSet(comm, QL.SERIF_RELATIONS);

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
      if (comm.situationMentionSetList[situationMentionSetIndex].metadata.tool === QL.SERIF_RELATIONS) {
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
  var nerTokenTagging = tokenization.getTokenTaggingsOfType("NER")[0];

  var ner_tag_labels = [];
  for (i = 0; i < nerTokenTagging.taggedTokenList.length; i++) {
    var nerTag = nerTokenTagging.taggedTokenList[i];
    var token = tokenization.tokenList.tokenList[nerTag.tokenIndex];
    var entityID = "T" + nerTag.tokenIndex;
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
      /*
      { type: 'In', labels: ['In', 'In'], bgColor: '#adf6a2' },
      { type: 'Out', labels: ['Out', 'Out'], bgColor: '#e4cbf6' },
      */
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
    // Our text of choice
    text     : sentence_text,
    // The entities entry holds all entity annotations
    entities : pos_tag_labels,
  };

  var brat_container_id = 'tokenization_pos_' + tokenization.uuid.uuidString;

  /** Create a popover menu with POS labels for token tags
   *
   * The SVG DOM for the BRAT labels looks like:
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
  var showPOSPopover = function(event) {
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
        // collData is defined in the enclosing scope
        for (var i=0, l=collData.entity_types.length; i < l; i++) {
          var label_text = collData.entity_types[i].labels[0];
          var label_color = collData.entity_types[i].bgColor;
          popover_html += '<span class="token_label" style="background-color: ' + label_color + '">' + label_text + '</span> ';
        }
        popover_html += '</div>';

        // We must specify a container for the popover - otherwise,
        // Bootstrap will try to insert the DOM element for the
        // popover in the SVG container, and the tooltip will not be
        // displayed.
        text.popover({content: popover_html, container: '#'+brat_container_id, html: true, placement: 'top'});
        text.popover('toggle');
      }
    }
  };

  /** Update a token's POS label when someone uses the menu created by showPOSPopover()
   */
  var updateTokenLabel = function(event) {
    var token_label_container = $(event.target).parent('div.token_label_container');
    var data_span_id = token_label_container.attr('data-span-id');
    var token_index = parseInt(token_label_container.attr('data-token-index'), 10);
    var token_label = $(this).text();

    // posTokenTagging is defined in the enclosing scope
    var tagged_token = posTokenTagging.getTaggedTokenWithTokenIndex(token_index);
    if (tagged_token) {
      tagged_token.tag = token_label;
    }

    // BRAT attaches the 'data-span-id' attribute to the <rect>
    var brat_span_rect = $('rect[data-span-id="' + data_span_id + '"]');

    var brat_span = brat_span_rect.parent('g.span');
    if (brat_span) {
      var text = brat_span.find('text');
      if (text && text[0]) {
        // Update text shown in SVG canvas
        text[0].textContent = token_label;

        // Update color of SVG rectangle to match color of menu label
        brat_span_rect.attr('fill', $(this).css('background-color'));

        // TODO: Update rectangle size
      }
    }
  };

  var dispatcher = Util.embed(
    // id of the div element where brat should embed the visualisations
    brat_container_id,
    // object containing collection data
    collData,
    // object containing document data
    docData,
    // Array containing locations of the visualisation fonts
    webFontURLs
  );

  dispatcher.on('dblclick', showPOSPopover);

  $('#' + brat_container_id).on('click', 'span.token_label', updateTokenLabel);
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
  /** Event handler for toggling an NER token tagging diagram
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

  /** Event handler for toggling a POS token tagging diagram
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

  /** Event handler for toggling a Serif ACE relations diagram
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

  /** Returns a boolean iff a Communication has SituationMention data from the specified tool
   * @param {Communication} comm
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
   * @params {Communication} comm
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
   * @params {Communication} comm
   * @params {String} toolname - Name of tool that created the SituationMentions
   * @returns {Object} Object keys are uuidStrings of matching Tokenizations
   */
  function getTokenizationsWithSituationMentions(comm, toolname) {
    var tokenizationsWithSerifRelations = {};
    var relationEntityMentionSet = QL.getRelationEntityMentionSet(comm, toolname);

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

  var hasSerifRelationsData = commHasSituationMentionData(comm, QL.SERIF_RELATIONS);
  var tokenizationsWithSerifRelations = getTokenizationsWithSituationMentions(comm, QL.SERIF_RELATIONS);

  for (var sectionIndex in comm.sectionList) {
    var section = comm.sectionList[sectionIndex];
    if (section.sentenceList) {
      for (var sentenceIndex in section.sentenceList) {
        var sentence = section.sentenceList[sentenceIndex];
        var tokenization = sentence.tokenization;

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
 * @params {Communication} comm
 * @params {String} toolname
 * @returns {Object} An object whose keys are the uuidStrings for relevant EntityMentions
 */
QL.getRelationEntityMentionSet = function(comm, toolname) {
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
