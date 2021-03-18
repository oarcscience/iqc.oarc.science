'use strict';

/* globals $: false */


/**
 * Accordion
 *
 * An accordion component.
 *
 * @param {jQuery} $el A jQuery html element to turn into an accordion.
 */
function Accordion($el) {
  var self = this;
  this.$root = $el;
  this.$root.on('click', 'button', function(ev) {
    var expanded = JSON.parse($(this).attr('aria-expanded'));
    ev.preventDefault();
    self.hideAll();
    if (!expanded) {
      self.show($(this));
    }
  });
}

Accordion.prototype.$ = function(selector) {
  return this.$root.find(selector);
}

Accordion.prototype.hide = function($button) {
  var selector = $button.attr('aria-controls'),
      $content = this.$('#' + selector);

  $button.attr('aria-expanded', false);
  $content.attr('aria-hidden', true);
};

Accordion.prototype.show = function($button) {
  var selector = $button.attr('aria-controls'),
      $content = this.$('#' + selector);

  if($content.length == 0) {
	  $content = $('#' + selector);
  }
  $button.attr('aria-expanded', true);
  $content.attr('aria-hidden', false);
};

Accordion.prototype.hideAll = function() {
  var self = this;
  this.$('button').each(function() {
    self.hide($(this));
  });
};

/**
 * accordion
 *
 * Initialize a new Accordion component.
 *
 * @param {jQuery} $el A jQuery html element to turn into an accordion.
 */
function accordion($el) {
  return new Accordion($el);
}


$(function() {
  $('[class^=usa-accordion]').each(function() {
    accordion($(this));
  });

  var footerAccordion = function() {
    if (window.innerWidth < 600) {

      $('.usa-footer-big nav ul').addClass('hidden');

      $('.usa-footer-big nav .usa-footer-primary-link').unbind('click');

      $('.usa-footer-big nav .usa-footer-primary-link').bind('click', function() {
        $(this).parent().removeClass('hidden')
        .siblings().addClass('hidden');
      });
    } else {

      $('.usa-footer-big nav ul').removeClass('hidden');

      $('.usa-footer-big nav .usa-footer-primary-link').unbind('click');
    }
  };

  footerAccordion();

  $(window).resize(function() {
    footerAccordion();
  });

  // Fixing skip nav focus behavior in chrome
  $('.skipnav').click(function(){
    $('#main-content').attr('tabindex','0');
  });

  $('#main-content').blur(function(){
    $(this).attr('tabindex','-1');
  });

});

/**
 * For the FAQ page, if there is a hash specifying
 * the question to be opened on load, open it.
 * Scroll to the li of the selected element.
 */
function accordianOnloadFAQ() {
	var hashString = window.location.hash;
	var idx = hashString.substring(hashString.indexOf('#')+1);
	if(isNaN(idx)) {
		return;
	}
	idx = parseInt(idx);
	if(idx < 1) {
		return;
	}
	idx -= 1; // The accordian starts the first the div id at 0
	var elt = $("#collapsible-" + idx);
	if(elt.length == 0) {
		return;
	}
	var div = accordion($(elt));
	var button = $('#collapsible-' + idx).prev('button');
    div.show($(button));
    var li = $("#collapsible-" + idx).parent('li');
    $(document).scrollTop( $(li).offset().top );
}

/**
 * Go to the given question number.
 * 
 * @param <integer> idx
 */
function accordianGoToFAQ(idx) {
	
	if(isNaN(idx)) {
		return;
	}
	idx = parseInt(idx);
	if(idx < 1) {
		return;
	}
	idx -= 1; // The accordian starts the first the div id at 0
	var elt = $("#collapsible-" + idx);
	if(elt.length == 0) {
		return;
	}
	var div = accordion($(elt));
	var button = $('#collapsible-' + idx).prev('button');
    div.show($(button));
    var li = $("#collapsible-" + idx).parent('li');
    $(document).scrollTop( $(li).offset().top );
}

