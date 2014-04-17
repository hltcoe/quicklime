function addNERTags(communicationUUID, sentenceUUID, tokenizationUUID) {
  var comm = getCommunicationWithUUID(communicationUUID);
  var sentence = getSentenceWithUUID(comm, sentenceUUID);
  var tokenization = getTokenizationWithUUID(comm, tokenizationUUID);

  var webFontURLs = [];

  // Tag names and colors are copied from the BRAT configuration file for
  // Stanford NLP:
  //   brat-v1.3_Crunchy_Frog/configurations/Stanford-CoreNLP/visual.conf
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
  }

  var comm = getCommunicationWithUUID(communicationUUID);
  var sentence_text = comm.text.substring(sentence.textSpan.start, sentence.textSpan.ending);
  var ner_tag_labels = [];

  for (var i = 0; i < tokenization.nerTagList.taggedTokenList.length; i++) {
    var nerTag = tokenization.nerTagList.taggedTokenList[i];
    var token = tokenization.tokenList[nerTag.tokenIndex];
    var entityID = "T" + (i+1);
    if (nerTag.tag != "O") {
      ner_tag_labels.push([entityID, nerTag.tag, [[token.textSpan.start, token.textSpan.ending]]]);
    }
  }

  var docData = { text: sentence_text, entities: ner_tag_labels };

  Util.embed('sentence_ner_' + sentence.uuid, collData, docData, webFontURLs);
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
Add buttons to sentence_control <div>'s:

    <div class="sentence_controls" id="sentence_controls_[SENTENCE_UUID]">
+     <button>
+     <button>
+     ...
 */
function addSentenceBRATControls(comm) {
  for (var sectionListIndex in comm.sectionSegmentations[0].sectionList) {
    if (comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation) {
      for (var sentenceIndex in comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList) {
        var sentence = comm.sectionSegmentations[0].sectionList[sectionListIndex].sentenceSegmentation[0].sentenceList[sentenceIndex];
        var tokenization = sentence.tokenizationList[0];

        var sentence_controls_div = $('#sentence_controls_' + sentence.uuid);

	var ner_tag_button = $('<button>')
          .attr('type', 'button')
          .addClass('btn btn-default btn-xs')
          .click({ comm_uuid: comm.uuid, sentence_uuid: sentence.uuid, tokenization_uuid: tokenization.uuid}, function(event) {
            if (hasNERTags(event.data.sentence_uuid)) {
              toggleNERTags(event.data.sentence_uuid);
            }
            else {
              addNERTags(event.data.comm_uuid, event.data.sentence_uuid, event.data.tokenization_uuid);
            }
          })
          .css('margin-right', '1em')
          .html("NER");
	if (!tokenization.nerTagList) {
	  ner_tag_button.attr('disabled', 'disabled');
	}
	sentence_controls_div.append(ner_tag_button);

	var pos_tag_button = $('<button>')
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
          .html("POS");
	if (!tokenization.posTagList) {
	  pos_tag_button.attr('disabled', 'disabled');
	}
	sentence_controls_div.append(pos_tag_button);
      }
    }
  }
}


function hasNERTags(sentenceUUID) {
  if ($("#sentence_ner_" + sentenceUUID + " svg").length > 0) {
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


function toggleNERTags(sentenceUUID) {
  $("#sentence_ner_" + sentenceUUID).toggle();
}


function togglePOSTags(sentenceUUID) {
  $("#sentence_pos_" + sentenceUUID).toggle();
}
