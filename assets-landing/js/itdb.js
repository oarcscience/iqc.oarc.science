/* global webSessionToken, $ITDB2 */

(function ($) {
    var form = $.fn.form = function() {
        return;
    };
    /**
     * Configure AJAX settings
     */
    $.ajaxSetup({
        headers: {
            'X-Session-Token': webSessionToken.toString() // The webSessionToken variable needs to be set in the page that runs this script...
        }
    });  
    $('body').attr("X-Session-Token", "configured");

    /**
     * Stuff to do on page load
     */
    $(document).ready(function() {

        // Override hrefs for certain links in the top menu bar.
        $('.nav a:contains("Agencies")').attr('href', '#nav-agencies');
        $('.nav a.dropdown-toggle:contains("Reports")').attr('href', '#');
        $('.nav a.dropdown-toggle:contains("Data")').attr('href', '#');
        $('.nav a.dropdown-toggle:contains("Links")').attr('href', '#');
        $('.nav a').filter(function() { return $(this).text() === 'Submissions'; }).after('<span>Submissions</span>');
        $('.nav a').filter(function() { return $(this).text() === 'Submissions'; }).remove();
        $('.nav a').filter(function() { return $(this).text() === 'CSV'; }).attr('href', '/drupal/data/datafeeds?format=csv');
        $('.nav a').filter(function() { return $(this).text() === 'XML'; }).attr('href', '/drupal/data/datafeeds?format=xml');
        $('.nav a').filter(function() { return $(this).text() === 'JSON'; }).attr('href', '/drupal/data/datafeeds?format=json');
        $('.nav a:contains("What\'s This Site")').attr('href', '/drupal/#learn-what');
        $('.nav a:contains("Who Uses")').attr('href', '/drupal/#learn-who');
        
        // Toggle Agencies menu item "open" effect
        $('.nav a:contains("Agencies")').click(function () {
            if ($(this).parent().hasClass('open')) {
                $(this).parent().removeClass('open');
            } else {
                $(this).parent().addClass('open');
            }
        });
        
        // Close Agencies menu when another dropdown menu item is clicked
        $('.nav a.dropdown-toggle:contains("Reports")').click(function () {
            if ($('.nav a:contains("Agencies")').parent().hasClass('open')) {
                $('.nav a:contains("Agencies")').parent().removeClass('open');
                $('#nav-agencies').collapse('hide');
            }
        });
        $('.nav a.dropdown-toggle:contains("Data")').click(function () {
            if ($('.nav a:contains("Agencies")').parent().hasClass('open')) {
                $('.nav a:contains("Agencies")').parent().removeClass('open');
                $('#nav-agencies').collapse('hide');
            }
        });
        
        // Strip Drupal classes from dropdown menu list containers and items.
        $('.nav .dropdown-menu').each(function() {
            $(this).find('ul, li').removeClass();
        });

        // Add separators above/below certain menu items.
        var separator = '<li class="divider" role="separator"></li>';
        $('.nav a:contains("Feeds")').parent().after(separator);

        // Enable "back to top" button if the document has a long scroll bar.
        // Note the window height + offset
        if ( ($(window).height() + 100) < $(document).height() ) {
            $('#top-link-block').removeClass('hidden').affix({
                // how far to scroll down before link "slides" into view
                offset: {top:100}
            });
        }
        
        // Contextualize "read more" link text
        setTimeout(function () {
            $('a.read-more').click(function() {
                if ($(this).text().match('more')) {
                    $(this).html($(this).html().replace('more', 'less'));
                } else {
                    $(this).html($(this).html().replace('less', 'more'));
                }
            });}, 5000 // give JS widgets a little time to load
        );
        
        // Contextualize "show more" link text
        $(document).on('click','a.show-more',function() {
            if ($(this).hasClass("collapsed")) {
                $(this).html($(this).html().replace('fewer', 'more'));
            } else {
                $(this).html($(this).html().replace('more', 'fewer'));
            }
        });

        // Attach behaviors to any content loaded via API
        setTimeout(function () {
                Drupal.attachBehaviors();
            }, 5000 // give the content a little time to load
        );

        // Add tabindex to all heading tags for better accessibility
        setTimeout(function () {
                $('h1, h2, h3, h4, h5, h6').attr('tabindex', '0');
            }, 5000 // give content a little time to load
        );

        // Add a label to the reCAPTCHA text box for better accessibility
        setTimeout(function () {
                $('#recaptcha_response_field').before('<label for="recaptcha_response_field" class="element-invisible">Type the text</label>');
            }, 5000 // give the feedback form a little time to load
        );

        // If there is an agency selector on this page, select the necessary option
        $('#agency-selector').val($ITDB2.agencyCode);

        // Bind actions to agency selector
        $('#agency-selector').change(function () {
            var params = $.query();
            params.a = $(this).val();
            window.location = '?' + $.param(params);
        });

        /**
         * FUTURE ACCESSIBILITY FEATURE
         *
         * TODO: Implement user controls to enable/disable this feature.
         *       The controls should be placed inside a div that is visible
         *       only to screen readers, and the related configuration setting
         *       should be saved in a cookie.
         *

         // A list of terms that are liable to be garbled in a screen reader,
         // each associated with more pronounceable alternate text
         var pronunciations = {

            // Agencies
            "DOD": "D O D",
            "DOT": "D O T",
            "ED": "education",
            "EPA": "E P A",
            "GSA": "G S A",
            "HHS": "H H S",
            "HUD": "hud",
            "DHS": "D H S",
            "OPM": "O P M",
            "NASA": "nasa",
            "NRC": "N R C",
            "NSF": "N S F",
            "OMB": "O M B",
            "SBA": "S B A",
            "SSA": "S S A",
            "USAID": "U S aid",
            "USDA": "U S D A",
            "VA": "V A",

            // Other acronyms
            "API": "A P I",
            "BY": "B Y ",
            "CFO": "C F O",
            "CSV": "C S V",
            "CY": "C Y ",
            "DCOI": "D C O I",
            "FAQ": "frequently asked question",
            "FDCCI": "F D C C I",
            "FITARA": "fitara"
            "FYE": "F Y E",
            "FY": "F Y ",
            "IT": "I T",
            "JSON": "J son",
            "PDFs": "P D efs",
            "PDF": "P D F",
            "XML": "X M L"

         }

         // If accessibility mode is enabled, scan the page for instances of
         // hard-to-pronounce keywords, and replace them with alternate text
         if (1 == 0) { // TODO: check cookie setting
            setTimeout(function () {
                    $.each(pronunciations, function (word, pronunciation) {
                        var elements = ['h1', 'h2', 'h3', 'p', 'li', 'label'];
                        for (e in elements) {
                            $(elements[e] + ':contains(' + word + ')').html(function(_, html) {
                                var regex = new RegExp(word, 'g')
                                return html.replace(regex, pronunciation);
                            });
                        }
                    });
                }, 5000 // give content a little time to load
            );
        }
        */

    });

    /**
     * Parse the URL query string
     * 
     * @param {string} key - URL parameter key
     * 
     * @returns {mixed} object of all parameters, when no key is specified
     *                  string value, when key is specified and exists
     *                  undefined if key is not found in query string
     *                  null if there is no query string
     */
    $.query = function (key) {
        var q = location.search.substring(1), params = {}, hash;
        if (q !== undefined) {
            q = q.split('&');
            for (var i in q) {
                hash = q[i].split('=');
                if (hash.length === 2) {
                    params[hash[0]] = hash[1];
                }
            }
            return key ? params[key] : params;
        }
        return null;
    };

})(jQuery);