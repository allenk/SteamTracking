
HelpWizard = {
	m_sCurrentPage: null,
	m_steamid: '',

	LoadPageFromHash: function( fresh_page_load ) {
		var hash = window.location.hash;
		if ( hash.length < 2 )
			hash = '#Home';

		var hash_params = $J.deparam( hash.replace('#','') );
		var search_active = (hash_params && (typeof hash_params.text !== 'undefined'));
		var search_text = null;
		if ( search_active )
		{
			search_text = hash_params.text;
			if ( fresh_page_load || search_text.length == 0 || $J('#help_search_support_input').length == 0 )
			{
				hash = '#' + hash_params.home;
				this.m_sHashStringParse = null;
			}
			else
			{
				// update search string
				this.SearchParseHashParameters( false );
				return;
			}
		}

		if ( hash == this.m_sCurrentPage )
			return;
		this.m_sCurrentPage = hash;

		$J( '#page_content' ).removeClass( 'page_loaded page_error' );

		hash = hash.slice( 1 );	// remove the '#'

		try
		{
			ga( 'send', 'pageview', '/wizard/' + hash );
		}
		catch ( e )
		{
		}

		$J.ajax( {
			url: 'https://help.steampowered.com/wizard/' + hash,
			type: 'GET',
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
			} )
		} ).fail( function( jqxhr ) {
			HelpWizard.ShowPageError();
		} ).done( function( data ) {
			if ( typeof Valve_OnHelpWizardNavigate != 'undefined' )
				Valve_OnHelpWizardNavigate( data );

			if ( data.redirect )
			{
				if ( data.replace )
					window.location.replace( data.redirect );
				else
					window.location = data.redirect;
				return;
			}

			if ( !data.html )
			{
				HelpWizard.ShowPageError();
				return;
			}

			if ( HelpWizard.m_steamid != data.steamid )
			{
				HelpWizard.UpdateMenuGlobalActions();
				HelpWizard.m_steamid = data.steamid;
			}

			$J( '#page_content' ).addClass( 'page_loaded' );
			$J('#wizard_contents').html( data.html );

			if ( search_active && search_text.length > 0 )
			{
				$J('#help_home_block').hide();
				$J('#search_breadcrumbs').show();
			}

		} ).always( function() {
			if ( search_active && search_text.length > 0 )
			{
				$J('#help_search_support_input').val( search_text );
				HelpWizard.SearchSupportFAQs( search_text );

			}
		} );
	},

	HookOnHashChange: function() {
		$J(window).on( 'hashchange', function() {
			HelpWizard.LoadPageFromHash( false );
		});
	},

	ShowPageError: function()
	{
		try
		{
			ga( 'send', 'pageview', '/wizard/PageError/' );
		}
		catch ( e )
		{
		}

		$J( '#page_content' ).removeClass( 'page_loaded' );
		$J( '#page_content' ).addClass( 'page_error' );
	},

	UpdateHashWithForm: function( targetHash, form )
	{
		window.location.hash = targetHash + '/?' + $J( form ).serialize();
	},

	SubmitRefundRequest: function( help_issue, appid, transid, gid_line_item, refund_to_wallet, spoofing ) {

		if ( this.m_bLoadingRefundDialog )
			return;	// don't submit while we are potentially loading new data

		var explanation = $J('#refund_text_input').val();
		explanation = explanation.substring(0,4000);	// don't send up too many characters

		if ( spoofing )
		{
			alert( 'you cannot submit a ticket because you are spoofing as another user' );
			return;
		}

		try
		{
			ga( 'send', 'pageview', '/wizard/AjaxSubmitRefundRequest/' );
		}
		catch ( e )
		{
		}

		$J.ajax( {
			url: 'https://help.steampowered.com/wizard/AjaxSubmitRefundRequest/',
			type: 'POST',
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				help_issue_origin: help_issue,
				help_issue: $J('#refund_reason_selector').val(),
				contact_email: $J('#contact_email').data( 'email' ),
				issue_text: explanation,
				issue_appid: appid,
				issue_transid: transid,
				issue_line_item: gid_line_item,
				refund_to_wallet: refund_to_wallet
			} )
		} ).fail( function( jqxhr ) {
			$J('#help_refund_request_dialog').html( 'failed to load' );
		} ).done( function( data ) {
			if ( !data.html )
			{
				HelpWizard.ShowPageError();
				return;
			}

			$J( '#help_refund_request_dialog' ).html( data.html );

		} ).always( function() {
		} );
	},

	CancelHelpRequest: function( help_requestid, transid, gid_line_item )
	{
		ShowConfirmDialog(
				'Cancel your refund request',
				'<div class="help_page_title">Are you sure?</div>' +
					'You can cancel this refund request if you\'d like to keep your purchase. You can submit a new refund request in the future.' +
					'<div id="help_cancel_refund_request_receipt" class="help_purchase_detail_box help_purchase_package">' +
					"<div class=\"LoadingWrapper\">\r\n\t\t\t\t\t<div class=\"LoadingThrobber\">\r\n\t\t\t\t\t\t<div class=\"Bar Bar1\"><\/div>\r\n\t\t\t\t\t\t<div class=\"Bar Bar2\"><\/div>\r\n\t\t\t\t\t\t<div class=\"Bar Bar3\"><\/div>\r\n\t\t\t\t\t<\/div>\r\n\t\t\t\t<\/div>" +
					'</div>',
				'Cancel refund request',
				'I\'d like a refund'
		).done( function() {
			$J.ajax( {
				url: 'https://help.steampowered.com/wizard/AjaxCancelHelpRequest/',
				type: 'POST',
				data: $J.extend( {}, g_rgDefaultWizardPageParams, {
					help_requestid: help_requestid
				} )
			} ).fail( function( jqxhr ) {
				ShowAlertDialog( 'Cancel your refund request', 'There was a problem canceling your request. Please try again.' );
			} ).done( function( data ) {
				if ( data.success )
				{
					ShowAlertDialog( 'Cancel your refund request',
							'Your refund request has been canceled.'
					).done( function() {
						$J('#help_refund_request_active').remove();
					} );
				}
				else
				{
					ShowAlertDialog( 'Cancel your refund request',
							'There was a problem canceling your request. Please try again.'
					);
				}
			} );
		} );

		$J.ajax( {
			url: 'https://help.steampowered.com/wizard/AjaxPackagePurchaseReceipt/',
			type: 'GET',
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				transid: transid,
				line_item: gid_line_item
			} )
		} ).done( function( data ) {
			if ( data.html )
			{
				$J('#help_cancel_refund_request_receipt').html( data.html );
			}
			else
			{
				$J('#help_cancel_refund_request_receipt').remove();
			}
		} );
	},

	// search data
	m_bSearchUpdatingHash: false,
	m_bSearchRunning: false,
	m_sSearchTextLoading: null,
	m_sSearchTextQueued: null,
	m_sSearchResultDisplayed: null,
	m_nLastKeyPressTimeMS: null,
	m_sHashStringParse: null,

	SearchBoxKeyUp: function( e ) {
		this.MoveUpSearchBox();

		// set a timer
		var time_now_ms = $J.now();
		this.m_nLastKeyPressTimeMS = time_now_ms;

		if ( e.which == 13 )
			this.CheckForSearchStart( time_now_ms );	// ENTER key triggers immediately
		else
			setTimeout( function() { HelpWizard.CheckForSearchStart( time_now_ms ); }, 400 );
	},

	CheckForSearchStart: function( time_last_keyup ) {
		if ( time_last_keyup == this.m_nLastKeyPressTimeMS ) {
			this.UpdateSearchHashURL();
		}
	},

	UpdateSearchHashURL: function() {
		var hash_params = {};
		hash_params.text = $J('#help_search_support_input').val().trim();
		hash_params.home = this.m_sCurrentPage.replace( '#', '' );

		var new_hash = $J.param( hash_params );
		if ( window.location.hash != new_hash )
		{
			this.m_bSearchUpdatingHash = true;
			window.location.hash = new_hash;
			// the change of the hash will trigger the actual start
		}
	},

	SearchParseHashParameters: function( fresh_page_load ) {

		if ( fresh_page_load )
			return;

		var hash_string = window.location.hash.replace('#','');
		if ( hash_string === this.m_sHashStringParse )
			return;	// we've handled this string already

		this.m_sHashStringParse = hash_string;

		var hash_params = $J.deparam( hash_string );
		if ( hash_params.text || fresh_page_load && $J('#help_search_support_input') )
		{
			if ( hash_params.text !== $J('#help_search_support_input').val().trim() )
				$J('#help_search_support_input').val( hash_params.text );
		}

		if ( this.m_bUpdatingHash )
			this.m_nTransitionSpeed = 500;	// we updated it, do it slow
		else
			this.m_nTransitionSpeed = 0;	// browser updated it, do it fast
		this.m_bUpdatingHash = false;

		// if there is text in the box, go
		if ( $J('#help_search_support_input').val().trim().length > 0 || fresh_page_load )
		{
			this.StartSearch();
		}
	},

	MoveUpSearchBox: function() {
		if ( $J('#help_search_support_input').val().length > 0 )
		{
			$J('#help_home_block').slideUp( 200 );
			$J('#help_home_block').hide( 200 );
			$J('#search_breadcrumbs').show();
		}
		else
		{
			$J('#help_home_block').show( 100 );
			$J('#faqs_search_results').html( '' );
			$J('#search_breadcrumbs').hide();
			this.m_sSearchResultDisplayed = null;
		}
	},

	StartSearch: function() {
		var search_text = $J('#help_search_support_input').val().trim();

		if ( search_text == this.m_sSearchTextLoading )
		{
			// do nothing, we're already searching for the same text
		}
		else if ( this.m_bSearchRunning )
		{
			this.m_sSearchTextQueued = search_text;
		}
		else if ( search_text != this.m_sSearchResultDisplayed )
		{
			this.SearchSupportFAQs( search_text );
		}
	},

	SearchSupportFAQs: function( text ) {
		this.m_bSearchRunning = true;
		this.m_sSearchTextLoading = text;

		try
		{
			ga( 'send', 'pageview', '/wizard/AjaxSearchResults/?l=' + g_strLanguage + '&text=' + encodeURIComponent(text) );
		}
		catch ( e )
		{
		}

		$J.ajax({
			type: "GET",
			url: "https://help.steampowered.com/wizard/AjaxSearchResults/",
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				text: text,
				l: g_strLanguage
			} )
		}).done( function( data ) {
			// update the text if the search term hasn't changed since we got the result
			if ( HelpWizard.m_sSearchTextQueued == null )
			{
				HelpWizard.m_sSearchResultDisplayed = data.search_text;
				$J('#faqs_search_results').html( data.html );
				$J('#faqs_search_results').fadeTo( 0, 1 );
			}
		}).always( function() {
			HelpWizard.m_bSearchRunning = false;
			HelpWizard.m_sSearchTextLoading = null;

			// start the search we have queued
			if ( HelpWizard.m_sSearchTextQueued )
			{
				HelpWizard.SearchSupportFAQs( HelpWizard.m_sSearchTextQueued );
				HelpWizard.m_sSearchTextQueued = null;
			}
		} );
	},

	m_bLoadingRefundDialog: false,
	m_nRefundAppID: null,
	m_nRefundIssueID: null,

	ShowRefundRequestForm: function( issueid, appid, transid, refund_to_wallet, loading_div ) {
		if ( this.m_bLoadingRefundDialog )
			return;

		if ( loading_div )
		{
			loading_div.html('<span style="margin:auto"><img src="https://steamcommunity-a.akamaihd.net/public/shared/images/login/throbber.gif" alt=""></span>');
		}
		else
		{
			$J('#help_refund_request_form').html('<div class="help_refund_request_area"><h1>Checking refund eligibility for this purchase...</h1><br><span style="margin:auto"><img src="https://steamcommunity-a.akamaihd.net/public/shared/images/login/throbber.gif" alt=""></span></div>');
		}

		try
		{
			ga( 'send', 'pageview', '/wizard/AjaxRefundRequestForm/?issueid=' + issueid + '&appid=' + appid + '&transid=' + transid + '&wallet=' + refund_to_wallet );
		}
		catch ( e )
		{
		}

		this.m_bLoadingRefundDialog = true;
		this.m_nRefundAppID = appid;
		this.m_nRefundIssueID = issueid;
		$J.ajax({
			type: "GET",
			url: "https://help.steampowered.com/wizard/AjaxRefundRequestForm",
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				issueid: issueid,
				appid: appid,
				transid: transid,
				wallet: refund_to_wallet
			} )
		}).fail( function() {
			$J('#help_refund_request_form').html('<div class="error_bg"><div id="error_description">We were unable to load information about this purchase. Please try again later. We apologize for the inconvenience.</div></div>');
		}).done( function( data ) {
			if ( data.html && $J('#help_refund_request_form') )
			{
				if ( $J('#refund_request_button') )
					$J('#refund_request_button').hide();
				if ( $J('#refund_gift_request_button') )
					$J('#refund_gift_request_button').show();
				$J('#help_refund_request_form').html( data.html );
			}
			else
			{
				$J('#help_refund_request_form').html('<div class="error_bg"><div id="error_description">Sorry! An unexpected error has occurred while processing your request. Please try again.</div></div>');
			}
		}).always( function() {
			HelpWizard.m_bLoadingRefundDialog = false;
		} );
	},

	UpdateRefundSelector: function() {
		var transid = $J('#refund_selector').val();
		var refund_to_wallet = $J('#refund_wallet_selector').val();
		this.ShowRefundRequestForm( this.m_nRefundIssueID, this.m_nRefundAppID, transid, refund_to_wallet, $J('#refund_info_box') );
	},

	ShowSubmitRefundArea: function() {
		$J('#refund_text_input').show();
		$J('#refund_submit_area').show();
		$J('#refund_submit_area_extra').show();
	},

	ShowGiftRefundRequestForm: function( gid_guestpass ) {
		this.m_bLoadingRefundDialog = true;
		$J.ajax({
			type: "GET",
			url: "https://help.steampowered.com/wizard/AjaxGiftRefundRequestForm",
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				gid_guestpass: gid_guestpass
			} )
		}).fail( function() {
			$J('#help_refund_request_form').html('<div class="error_bg"><div id="error_description">We were unable to load information about this purchase. Please try again later. We apologize for the inconvenience.</div></div>');
		}).done( function( data ) {
			if ( data.html && $J('#help_refund_request_form') )
			{
				if ( $J('#refund_request_button') )
					$J('#refund_request_button').show();
				if ( $J('#refund_gift_request_button') )
					$J('#refund_gift_request_button').hide();
				$J('#help_refund_request_form').html( data.html );
			}
			else
			{
				$J('#help_refund_request_form').html('<div class="error_bg"><div id="error_description">Sorry! An unexpected error has occurred while processing your request. Please try again.</div></div>');
			}
		}).always( function() {
			HelpWizard.m_bLoadingRefundDialog = false;
		} );
	},

	MarkGiftRefundableChange: function( gid_guestpass ) {
		var mark_refundable = $J('#gift_refundable').prop('checked');

		$J.ajax( {
			url: 'https://help.steampowered.com/wizard/AjaxMarkGiftRefundable/',
			type: 'POST',
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				gid_guestpass: gid_guestpass,
				mark_refundable: mark_refundable ? 1 : 0,
			} )
		} ).fail( function( jqxhr ) {
			$J('#help_refund_request_dialog').html( 'failed to load' );
		} ).done( function( data ) {
			if ( data.marked_refundable )
				$J('#gift_refundable_notes').show();
			else
				$J('#gift_refundable_notes').hide();

		} ).always( function() {
		} );
	},

	// password reset related
	m_strLastPassword: '',
	m_timerCheckPassword: null,
	m_timerCheckReenterPassword: null,
	m_bPasswordAvailable: false,

	SetPasswordTag: function( strTagID, strClass, strText )
	{
		if ( strText.length == 0 )
		{
			$J( strTagID ).removeClass( 'visible' );
			return;
		}

		$J( strTagID ).text( strText );
		$J( strTagID ).removeClass( 'error warning' );
		$J( strTagID ).addClass( strClass );
		$J( strTagID ).addClass( 'visible' );
	},

	CheckPasswordStrength: function( strLogin ) {
		var strPassword = $J( '#password_reset' ).val();
		if ( strPassword == this.m_strLastPassword )
			return;

		this.m_bPasswordAvailable = false;
		this.m_strLastPassword = strPassword;
		if ( this.m_timerCheckPassword )
		{
			clearTimeout( this.m_timerCheckPassword );
			this.m_timerCheckPassword = null;
		}

		this.m_timerCheckPassword = setTimeout( function() { HelpWizard.CheckPasswordAvailable( strLogin ); }, 250 );
	},

	IsPasswordProhibited: function( strLogin, strPassword ) {
		if ( strPassword.length < 8 )
			return 'Password must be at least 8 characters long';
		
		if ( strPassword.search( /[^\x00-\x7F]/g ) >= 0 )
			return 'Password can only contain ASCII characters';

		if ( strLogin.toLowerCase() == strPassword.toLowerCase() )
			return "Can't use your user name as your password";

		return null;
	},

	CheckPasswordAvailable: function( strLogin ) {
		this.m_timerCheckPassword = null;
		var strPassword = $J( '#password_reset' ).val();

		if ( strPassword == '' )
			return HelpWizard.SetPasswordTag( '#password_tag', '', '' );

		if ( strLogin.length > 0 && strLogin.toLowerCase() == strPassword.toLowerCase() )
			return HelpWizard.SetPasswordTag( '#password_tag', 'error', 'Can\'t use your user name as your password' );

		if ( strPassword.length < 7 )
			return HelpWizard.SetPasswordTag( '#password_tag', 'error', 'Password must contain at least 7 characters' );

		var iInvalidChar = strPassword.search( /[^\x00-\x7F]/g );
		if ( iInvalidChar >= 0 )
			return HelpWizard.SetPasswordTag( '#password_tag', 'error', '%s can\'t be used in passwords'.replace( /%s/, strPassword.charAt( iInvalidChar ) ) );

		var _this = this;
		$J.ajax({
			type: "GET",
			url: "https://help.steampowered.com/wizard/AjaxCheckPasswordAvailable/",
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				password: strPassword
			} )
		}).done( function( data ) {
			$J( '#password_strength_display' ).removeClass( 'unchecked notallowed weak ok strong' );
			if ( !data.available )
			{
				_this.m_bPasswordAvailable = false;
				HelpWizard.SetPasswordTag( '#password_tag', 'error', 'Choose a less commonly used password' );
			}
			else
			{
				_this.m_bPasswordAvailable = true;
				var strStrength = HelpWizard.CalculatePasswordStrength( strPassword );
				if ( strPassword.length == 0 )
					HelpWizard.SetPasswordTag( '#password_tag', '', '' );
				else if ( strStrength == 'strong' )
					HelpWizard.SetPasswordTag( '#password_tag', 'good', '' );
				else
					HelpWizard.SetPasswordTag( '#password_tag', 'warning', 'Include a-z, A-Z, 0-9 or symbols for a stronger password' );
			}

			HelpWizard.CheckPasswordsMatch();
		});
	},

		CalculatePasswordStrength: function( pass ) {
		var bHasUppercase = false;
		var bHasLowercase = false;
		var bHasNumbers = false;
		var bHasSymbols = false;

		for( i = 0; i < pass.length; ++i )
		{
			if ( pass.charAt(i) >= 'a' && pass.charAt(i) <= 'z' )
				bHasLowercase = true;
			else if ( pass.charAt(i) >= 'A' && pass.charAt(i) <= 'Z' )
				bHasUppercase = true;
			else if ( pass.charAt(i) >= '0' && pass.charAt(i) <= '9' )
				bHasNumbers = true;
			else
				bHasSymbols = true;
		}

		var nTypesOfChars = 0;
		if ( bHasUppercase ) nTypesOfChars++;
		if ( bHasLowercase ) nTypesOfChars++;
		if ( bHasNumbers ) nTypesOfChars++;
		if ( bHasSymbols ) nTypesOfChars++;

		if ( nTypesOfChars >= 3 )
		{
						return 'strong';
		}
		else if ( (nTypesOfChars < 2 && !bHasSymbols )  )
		{
						return 'weak';
		}

				return 'ok';
	},

	CheckReenterPassword: function()
	{
		HelpWizard.SetPasswordTag( '#reenter_tag', '', '' );
		if ( this.m_timerCheckReenterPassword )
			window.clearTimeout( this.m_timerCheckReenterPassword );

		this.m_timerCheckReenterPassword = window.setTimeout( this.CheckPasswordsMatch, 1000 );
	},

	CheckPasswordsMatch: function()
	{
		var strPassword = $J( '#password_reset' ).val();
		var strReenter = $J( '#password_reset_confirm' ).val();
		if ( strPassword.length > 0 && strReenter.length > 0 && strPassword != strReenter )
			HelpWizard.SetPasswordTag( '#reenter_tag', 'error', 'Passwords do not match' );
		else
			HelpWizard.SetPasswordTag( '#reenter_tag', '', '' );
	},

	SubmitPasswordChange: function( strSessionID, strCode, nAccountID, strLogin ) {
		var elError = $J( '#changepw_error_msg' );
		var strPassword = $J( '#password_reset' ).val();
		var strTwoFactor = $J( '#password_twofactor' ).length ? $J( '#password_twofactor' ).val() : '';
		elError.hide();
		if ( strPassword != $J( '#password_reset_confirm' ).val() )
		{
			elError.text( 'Passwords do not match' ).slideDown();
			return;
		}

		if ( !this.m_bPasswordAvailable )
		{
			elError.text( 'The entered password is invalid' ).slideDown();
			return;
		}

		$J( '#change_password_form' ).addClass( 'loading' );
		$J.ajax({
			type: "POST",
			url: "https://help.steampowered.com/login/getrsakey/",
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				username: strLogin
			} )
		}).fail( function( xhr ) {
			elError.text( 'An error occurred trying to handle that request. Please give us a few minutes and try again.' ).slideDown();
			$J( '#change_password_form' ).removeClass( 'loading' );
		}).done( function( data ) {
			HelpWizard.SubmitPasswordChangeRSA( strSessionID, strCode, nAccountID, data );
		});
	},

	SubmitPasswordChangeRSA: function( strSessionID, strCode, nAccountID, rsa ) {
		var elError = $J( '#changepw_error_msg' );
		if ( !rsa.publickey_mod || !rsa.publickey_exp || !rsa.timestamp )
		{
			elError.text( 'An error occurred trying to handle that request. Please give us a few minutes and try again.' ).slideDown();
			$J( '#change_password_form' ).removeClass( 'loading' );
			return;
		}

		var strPassword = $J( '#password_reset' ).val();
		var strTwoFactor = $J( '#password_twofactor' ).length ? $J( '#password_twofactor' ).val() : '';

		var pubKey = RSA.getPublicKey( rsa.publickey_mod, rsa.publickey_exp );
		var strPasswordEncrypted = RSA.encrypt( strPassword, pubKey );

		try
		{
			ga( 'send', 'pageview', '/wizard/AjaxAccountRecoveryChangePassword/' );
		}
		catch ( e )
		{
		}

		$J.ajax({
			type: "POST",
			url: "https://help.steampowered.com/wizard/AjaxAccountRecoveryChangePassword/",
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				s: strSessionID,
				code: strCode,
				accountid: nAccountID,
				password: strPasswordEncrypted,
				rsatimestamp: rsa.timestamp,
				twofactor: strTwoFactor
			} )
		}).fail( function( xhr ) {
			elError.text( 'An error occurred trying to handle that request. Please give us a few minutes and try again.' ).slideDown();
		}).done( function( data ) {
			if ( data.hash )
			{
				window.location.hash = data.hash;
			}
			else if ( data.html )
			{
				$J('#wizard_contents').html( data.html );
				return;
			}
			else
			{
				elError.text( data.errorMsg ).show();
			}
		}).always( function() {
			$J( '#change_password_form' ).removeClass( 'loading' );
		});
	},

	ResetTwoFactor: function( strSessionID, strCode, nAccountID, strLogin )
	{
		$J( '#reset_twofactor_form' ).addClass( 'loading' );
		$J( '#form_submit_error' ).hide();
		$J.ajax({
			type: "POST",
			url: "https://help.steampowered.com/login/getrsakey/",
			data: {
				sessionid: g_sessionID,
				username: strLogin
			}
		}).fail( function( xhr ) {
			$J( '#form_submit_error' ).text( 'An error occurred trying to handle that request. Please give us a few minutes and try again.' ).slideDown();
			$J( '#reset_twofactor_form' ).removeClass( 'loading' );
		}).done( function( data ) {
			HelpWizard.ResetTwoFactorRSA( strSessionID, strCode, nAccountID, data );
		});
	},

	ResetTwoFactorRSA: function( strSessionID, strCode, nAccountID, rsa )
	{
		var elError = $J( '#form_submit_error' );
		if ( !rsa.publickey_mod || !rsa.publickey_exp || !rsa.timestamp )
		{
			$J( '#reset_twofactor_form' ).removeClass( 'loading' );
			elError.text( 'An error occurred trying to handle that request. Please give us a few minutes and try again.' ).slideDown();
			return;
		}

		var strPassword = $J( '#twofactor_password' ).val();
		var strTwoFactorCode = $J( '#twofactor_resetcode' ).val();

		var pubKey = RSA.getPublicKey( rsa.publickey_mod, rsa.publickey_exp );
		var strPasswordEncrypted = RSA.encrypt( strPassword, pubKey );

		try
		{
			ga( 'send', 'pageview', '/wizard/AjaxAccountRecoveryResetTwoFactor/' );
		}
		catch ( e )
		{
		}

		$J.ajax({
			type: "POST",
			url: "https://help.steampowered.com/wizard/AjaxAccountRecoveryResetTwoFactor/",
			data: {
				sessionid: g_sessionID,
				s: strSessionID,
				code: strCode,
				accountid: nAccountID,
				password: strPasswordEncrypted,
				rsatimestamp: rsa.timestamp,
				twofactor: strTwoFactorCode
			}
		}).fail( function( xhr ) {
			elError.text( 'An error occurred trying to handle that request. Please give us a few minutes and try again.' ).slideDown();
		}).done( function( data ) {
			if ( data.hash )
			{
				window.location.hash = data.hash;
			}
			else if ( data.html )
			{
				$J('#wizard_contents').html( data.html );
				return;
			}
			else
			{
				elError.text( data.errorMsg ).show();
			}
		}).always( function( data ) {
			$J( '#reset_twofactor_form' ).removeClass( 'loading' );
		});
	},

	FormRequestAndRedirect: function( form ) {
		var form = $J( form );
		var elError = $J( '#form_submit_error' );
		form.addClass( 'loading' );
		elError.hide();

		$J.ajax({
			type: form.attr( 'method' ),
			url: form.attr( 'action' ),
			data: form.serialize() + "&" + $J.param( g_rgDefaultWizardPageParams )
		}).fail( function( xhr ) {
			elError.text( 'An error occurred trying to handle that request. Please give us a few minutes and try again.' ).slideDown();
		}).done( function( data ) {
			if ( data.hash )
			{
				window.location.hash = data.hash;
			}
			else if ( data.html )
			{
				$J('#wizard_contents').html( data.html );
			}
			else
			{
				elError.text( data.errorMsg ).slideDown();
			}
		}).always( function() {
			form.removeClass( 'loading' );
		});

		return false;
	},

	SendAccountRecoveryCode: function( strSessionID, eMethod, bFirstAttempt ) {
		var elError = $J( '#form_submit_error' );

		try
		{
			ga( 'send', 'pageview', '/wizard/AjaxSendAccountRecoveryCode/' );
		}
		catch ( e )
		{
		}

		if ( !bFirstAttempt )
			$J( '#resend_recovery_code' ).addClass( 'loading' );

		$J( '#recovery_code_resent' ).hide();
		elError.hide();
		$J.ajax({
			type: "POST",
			url: "https://help.steampowered.com/wizard/AjaxSendAccountRecoveryCode",
			data: $J.extend( {}, g_rgDefaultWizardPageParams, {
				s: strSessionID,
				method: eMethod
			} )
		}).fail( function( xhr ) {
			elError.text( 'An error occurred trying to handle that request. Please give us a few minutes and try again.' ).slideDown();
		}).done( function( data ) {
			if ( data.success )
			{
				if ( !bFirstAttempt )
					$J( '#recovery_code_resent' ).slideDown();

				return;
			}

			if ( data.html )
			{
				$J('#wizard_contents').html( data.html );
				return;
			}

			elError.text( data.errorMsg ).slideDown();
		}).always( function() {
			$J( '#resend_recovery_code' ).removeClass( 'loading' );
		});
	},

	UpdateMenuGlobalActions: function()
	{
		$J.ajax({
			url: 'https://help.steampowered.com/login/getmenuactions/',
			type: 'GET',
			data: g_rgDefaultWizardPageParams
		}).fail( function( jqxhr ) {
				$J('#global_actions').hide();
		}).done( function( data ) {
			if ( data.html )
				$J('#global_actions').html( data.html );
		});
	},
};

function Logout()
{
	var $Form = $J('<form/>', {'action': 'https://help.steampowered.com/login/logout/', 'method': 'POST' } );
	$Form.append( $J('<input/>', {'type': 'hidden', 'name': 'sessionid', 'value': g_sessionID } ) );
	$Form.appendTo( 'body' );
	$Form.submit();
}

// taken from the store
function InitAutocollapse()
{
	$J('.game_page_autocollapse').each( function() {
		var content = this;
		var $Content = $J(content);
		$Content.wrap( $J('<div/>', {'class': 'game_page_autocollapse_ctn' } ) );

		var $Container = $Content.parent();

		var $ReadMore = $J('<div/>', {'class': 'game_page_autocollapse_readmore' }).text( 'READ MORE' );
		var $Fade = $J('<div/>', {'class': 'game_page_autocollapse_fade' } ).append( $ReadMore );
		$Container.append( $Fade );

		var nInterval = 0;
		var nMaxHeight = parseInt( $Content.css('max-height') );
		var bMaxHeightSet = true;

		$Content.on( 'gamepage_autocollapse_expand', function() {
			if ( $Container.hasClass( 'collapsed' ) )
			{
				$Container.removeClass( 'collapsed' );
				$Container.addClass( 'expanded' );

				if ( bMaxHeightSet )
				{
					$Content.animate( {'max-height': content.scrollHeight + 20 + 'px'}, 'fast', null, function() { $Content.css('max-height', 'none' ); } );
				}
				window.clearInterval( nInterval );
			}
		});

		$ReadMore.click( function() { $Content.trigger('gamepage_autocollapse_expand'); } );

		var fnCheckHeight = function ()	{
			if ( content.scrollHeight > nMaxHeight + 30 )
			{
				$Content.css( 'max-height', nMaxHeight + 'px' );
				$Container.addClass( 'collapsed' );
				window.clearInterval( nInterval );
				bMaxHeightSet = true;
			}
			else if ( bMaxHeightSet )
			{
				$Content.css( 'max-height', 'none' );
				bMaxHeightSet = false;
			}
		};

		nInterval = window.setInterval( fnCheckHeight, 250 );
		fnCheckHeight();

	});
}


function ChangeLanguage( strTargetLanguage, bStayOnPage )
{
	var Modal = ShowBlockingWaitDialog( 'Change language', '' );
	$J.post( 'https://help.steampowered.com/login/setlanguage/', {language: strTargetLanguage, sessionid: g_sessionID })
		.done( function() {
			if ( bStayOnPage )
				Modal.Dismiss();
			else
			{
				if ( window.location.href.match( /[?&]l=/ ) )
					window.location = window.location.href.replace( /([?&])l=[^&]*&?/, '$1' );
				else
					window.location.reload();
			}
		}).fail( function() {
			Modal.Dismiss();
			ShowAlertDialog( 'Change language', 'There was a problem communicating with the Steam servers.  Please try again later.' );
		});
}