// <nowiki>

(function() {

/*
 ****************************************
 *** twinkleprotect.js: Protect/RPP module
 ****************************************
 * Mode of invocation:     Tab ("PP"/"RPP")
 * Active on:              Non-special, non-MediaWiki pages
 */

// Note: a lot of code in this module is re-used/called by batchprotect.

Twinkle.protect = function twinkleprotect() {
	if (mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgNamespaceNumber') === 8) {
		return;
	}

	Twinkle.addPortletLink(Twinkle.protect.callback, Morebits.userIsSysop ? 'PP' : 'RPP', 'tw-rpp',
		Morebits.userIsSysop ? 'Lindungi halaman' : 'Meminta perlindungan halaman');
};

Twinkle.protect.callback = function twinkleprotectCallback() {
	const Window = new Morebits.SimpleWindow(620, 530);
	Window.setTitle(Morebits.userIsSysop ? 'Mememberikan atau meminta tag perlindungan halaman' : 'Meminta atau menandai perlindungan halaman');
	Window.setScriptName('Twinkle');
	Window.addFooterLink('Templat perlindungan', 'Templat:Templat perlindungan');
	Window.addFooterLink('Kebijakan perlindungan', 'WP:PROT');
	Window.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#lindungi');
	Window.addFooterLink('Berikan umpan balik', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.protect.callback.evaluate);
	const actionfield = form.append({
		type: 'field',
		label: 'Jenis tindakan'
	});
	if (Morebits.userIsSysop) {
		actionfield.append({
			type: 'radio',
			name: 'actiontype',
			event: Twinkle.protect.callback.changeAction,
			list: [
				{
					label: 'Lindungi halaman',
					value: 'protect',
					tooltip: 'Menambahkan perlindungan sebenarnya di halaman.',
					checked: true
				}
			]
		});
	}
	actionfield.append({
		type: 'radio',
		name: 'actiontype',
		event: Twinkle.protect.callback.changeAction,
		list: [
			{
				label: 'Meminta perlindungan halaman',
				value: 'request',
				tooltip: 'Jika anda ingin meminta perlindungan melalui WP:RPP' + (Morebits.userIsSysop ? ' daripada melindungi dengan anda sendiri.' : '.'),
				checked: !Morebits.userIsSysop
			},
			{
				label: 'Tandai halaman dengan templat perlindungan',
				value: 'tag',
				tooltip: 'Jika pengurus lupa untuk menambahkan templat perlindungan, atau anda dapat melindungi halaman tanpa menandai, anda dapat menggunakan hal ini untuk menambahkan tag perlindungan yang sesuai.',
				disabled: mw.config.get('wgArticleId') === 0 || mw.config.get('wgPageContentModel') === 'Scribunto' || mw.config.get('wgNamespaceNumber') === 710 // TimedText
			}
		]
	});

	form.append({ type: 'field', label: 'Preset', name: 'field_preset' });
	form.append({ type: 'field', label: '1', name: 'field1' });
	form.append({ type: 'field', label: '2', name: 'field2' });

	form.append({ type: 'submit' });

	const result = form.render();
	Window.setContent(result);
	Window.display();

	// We must init the controls
	const evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.actiontype[0].dispatchEvent(evt);

	// get current protection level asynchronously
	Twinkle.protect.fetchProtectionLevel();
};

// A list of bots who may be the protecting sysop, for whom we shouldn't
// remind the user contact before requesting unprotection (evaluate)
Twinkle.protect.trustedBots = ['MusikBot II', 'TFA Protector Bot'];

// Customizable namespace and FlaggedRevs settings
// In theory it'd be nice to have restrictionlevels defined here,
// but those are only available via a siteinfo query

// mw.loader.getState('ext.flaggedRevs.review') returns null if the
// FlaggedRevs extension is not registered.  Previously, this was done with
// wgFlaggedRevsParams, but after 1.34-wmf4 it is no longer exported if empty
// (https://gerrit.wikimedia.org/r/c/mediawiki/extensions/FlaggedRevs/+/508427)
const hasFlaggedRevs = mw.loader.getState('ext.flaggedRevs.review') &&
// FlaggedRevs only valid in some namespaces, hardcoded until [[phab:T218479]]
(mw.config.get('wgNamespaceNumber') === 0 || mw.config.get('wgNamespaceNumber') === 4);
// Limit template editor; a Twinkle restriction, not a site setting
const isTemplate = mw.config.get('wgNamespaceNumber') === 10 || mw.config.get('wgNamespaceNumber') === 828;

// Contains the current protection level in an object
// Once filled, it will look something like:
// { edit: { level: "sysop", expiry: <some date>, cascade: true }, ... }
Twinkle.protect.currentProtectionLevels = {};

// returns a jQuery Deferred object, usage:
//   Twinkle.protect.fetchProtectingAdmin(apiObject, pageName, protect/stable).done(function(admin_username) { ...code... });
Twinkle.protect.fetchProtectingAdmin = function twinkleprotectFetchProtectingAdmin(api, pageName, protType, logIds) {
	logIds = logIds || [];

	return api.get({
		format: 'json',
		action: 'query',
		list: 'logevents',
		letitle: pageName,
		letype: protType
	}).then((data) => {
		// don't check log entries that have already been checked (e.g. don't go into an infinite loop!)
		const event = data.query ? $.grep(data.query.logevents, (le) => $.inArray(le.logid, logIds))[0] : null;
		if (!event) {
			// fail gracefully
			return null;
		} else if (event.action === 'move_prot' || event.action === 'move_stable') {
			return twinkleprotectFetchProtectingAdmin(api, protType === 'protect' ? event.params.oldtitle_title : event.params.oldtitle, protType, logIds.concat(event.logid));
		}
		return event.user;
	});
};

Twinkle.protect.fetchProtectionLevel = function twinkleprotectFetchProtectionLevel() {

	const api = new mw.Api();
	const protectDeferred = api.get({
		format: 'json',
		indexpageids: true,
		action: 'query',
		list: 'logevents',
		letype: 'protect',
		letitle: mw.config.get('wgPageName'),
		prop: hasFlaggedRevs ? 'info|flagged' : 'info',
		inprop: 'protection|watched',
		titles: mw.config.get('wgPageName')
	});
	const stableDeferred = api.get({
		format: 'json',
		action: 'query',
		list: 'logevents',
		letype: 'stable',
		letitle: mw.config.get('wgPageName')
	});

	const earlyDecision = [protectDeferred];
	if (hasFlaggedRevs) {
		earlyDecision.push(stableDeferred);
	}

	$.when.apply($, earlyDecision).done((protectData, stableData) => {
		// $.when.apply is supposed to take an unknown number of promises
		// via an array, which it does, but the type of data returned varies.
		// If there are two or more deferreds, it returns an array (of objects),
		// but if there's just one deferred, it retuns a simple object.
		// This is annoying.
		protectData = $(protectData).toArray();

		const pageid = protectData[0].query.pageids[0];
		const page = protectData[0].query.pages[pageid];
		const current = {};
		let adminEditDeferred;

		// Save requested page's watched status for later in case needed when filing request
		Twinkle.protect.watched = page.watchlistexpiry || page.watched === '';

		$.each(page.protection, (index, protection) => {
			// Don't overwrite actual page protection with cascading protection
			if (!protection.source) {
				current[protection.type] = {
					level: protection.level,
					expiry: protection.expiry,
					cascade: protection.cascade === ''
				};
				// logs report last admin who made changes to either edit/move/create protection, regardless if they only modified one of them
				if (!adminEditDeferred) {
					adminEditDeferred = Twinkle.protect.fetchProtectingAdmin(api, mw.config.get('wgPageName'), 'protect');
				}
			} else {
				// Account for the page being covered by cascading protection
				current.cascading = {
					expiry: protection.expiry,
					source: protection.source,
					level: protection.level // should always be sysop, unused
				};
			}
		});

		if (page.flagged) {
			current.stabilize = {
				level: page.flagged.protection_level,
				expiry: page.flagged.protection_expiry
			};
			adminEditDeferred = Twinkle.protect.fetchProtectingAdmin(api, mw.config.get('wgPageName'), 'stable');
		}

		// show the protection level and log info
		Twinkle.protect.hasProtectLog = !!protectData[0].query.logevents.length;
		Twinkle.protect.protectLog = Twinkle.protect.hasProtectLog && protectData[0].query.logevents;
		Twinkle.protect.hasStableLog = hasFlaggedRevs ? !!stableData[0].query.logevents.length : false;
		Twinkle.protect.stableLog = Twinkle.protect.hasStableLog && stableData[0].query.logevents;
		Twinkle.protect.currentProtectionLevels = current;

		if (adminEditDeferred) {
			adminEditDeferred.done((admin) => {
				if (admin) {
					$.each(['edit', 'move', 'create', 'stabilize', 'cascading'], (i, type) => {
						if (Twinkle.protect.currentProtectionLevels[type]) {
							Twinkle.protect.currentProtectionLevels[type].admin = admin;
						}
					});
				}
				Twinkle.protect.callback.showLogAndCurrentProtectInfo();
			});
		} else {
			Twinkle.protect.callback.showLogAndCurrentProtectInfo();
		}
	});
};

Twinkle.protect.callback.showLogAndCurrentProtectInfo = function twinkleprotectCallbackShowLogAndCurrentProtectInfo() {
	const currentlyProtected = !$.isEmptyObject(Twinkle.protect.currentProtectionLevels);

	if (Twinkle.protect.hasProtectLog || Twinkle.protect.hasStableLog) {
		const $linkMarkup = $('<span>');

		if (Twinkle.protect.hasProtectLog) {
			$linkMarkup.append(
				$('<a target="_blank" href="' + mw.util.getUrl('Istimewa:Catatan', {action: 'view', page: mw.config.get('wgPageName'), type: 'protect'}) + '">catatan perlindungan</a>'));
			if (!currentlyProtected || (!Twinkle.protect.currentProtectionLevels.edit && !Twinkle.protect.currentProtectionLevels.move)) {
				const lastProtectAction = Twinkle.protect.protectLog[0];
				if (lastProtectAction.action === 'unprotect') {
					$linkMarkup.append(' (tidak dilindungi ' + new Morebits.Date(lastProtectAction.timestamp).calendar('utc') + ')');
				} else { // protect or modify
					$linkMarkup.append(' (kedaluwarsa ' + new Morebits.Date(lastProtectAction.params.details[0].expiry).calendar('utc') + ')');
				}
			}
			$linkMarkup.append(Twinkle.protect.hasStableLog ? $('<span> &bull; </span>') : null);
		}

		if (Twinkle.protect.hasStableLog) {
			$linkMarkup.append($('<a target="_blank" href="' + mw.util.getUrl('Special:Log', {action: 'view', page: mw.config.get('wgPageName'), type: 'stable'}) + '">catatan perubahan tertunda</a>)'));
			if (!currentlyProtected || !Twinkle.protect.currentProtectionLevels.stabilize) {
				const lastStabilizeAction = Twinkle.protect.stableLog[0];
				if (lastStabilizeAction.action === 'reset') {
					$linkMarkup.append(' (reset ' + new Morebits.Date(lastStabilizeAction.timestamp).calendar('utc') + ')');
				} else { // config or modify
					$linkMarkup.append(' (expired ' + new Morebits.Date(lastStabilizeAction.params.expiry).calendar('utc') + ')');
				}
			}
		}

		Morebits.Status.init($('div[name="hasprotectlog"] span')[0]);
		Morebits.Status.warn(
			currentlyProtected ? 'Perlindungan halaman' : 'Halaman ini telah dilindungi sebelumnya',
			$linkMarkup[0]
		);
	}

	Morebits.Status.init($('div[name="currentprot"] span')[0]);
	let protectionNode = [], statusLevel = 'info';

	if (currentlyProtected) {
		$.each(Twinkle.protect.currentProtectionLevels, (type, settings) => {
			let label = type === 'stabilize' ? 'Perubahan tertunda' : Morebits.string.toUpperCaseFirstChar(type);

			if (type === 'cascading') { // Covered by another page
				label = 'Menaikkan perlindungan ';
				protectionNode.push($('<b>' + label + '</b>')[0]);
				if (settings.source) { // Should by definition exist
					const sourceLink = '<a target="_blank" href="' + mw.util.getUrl(settings.source) + '">' + settings.source + '</a>';
					protectionNode.push($('<span>from ' + sourceLink + '</span>')[0]);
				}
			} else {
				let level = settings.level;
				// Make cascading protection more prominent
				if (settings.cascade) {
					level += ' (cascading)';
				}
				protectionNode.push($('<b>' + label + ': ' + level + '</b>')[0]);
			}

			if (settings.expiry === 'infinity') {
				protectionNode.push(' (selamanya) ');
			} else {
				protectionNode.push(' (kedaluwarsa ' + new Morebits.Date(settings.expiry).calendar('utc') + ') ');
			}
			if (settings.admin) {
				const adminLink = '<a target="_blank" href="' + mw.util.getUrl('Pembicaraan pengguna:' + settings.admin) + '">' + settings.admin + '</a>';
				protectionNode.push($('<span>oleh ' + adminLink + '</span>')[0]);
			}
			protectionNode.push($('<span> \u2022 </span>')[0]);
		});
		protectionNode = protectionNode.slice(0, -1); // remove the trailing bullet
		statusLevel = 'warn';
	} else {
		protectionNode.push($('<b>tidak ada perlindungan</b>')[0]);
	}

	Morebits.Status[statusLevel]('Tingkat perlidungan sekarang', protectionNode);
};

Twinkle.protect.callback.changeAction = function twinkleprotectCallbackChangeAction(e) {
	let field_preset;
	let field1;
	let field2;

	switch (e.target.values) {
		case 'protect':
			field_preset = new Morebits.QuickForm.Element({ type: 'field', label: 'Preset', name: 'field_preset' });
			field_preset.append({
				type: 'select',
				name: 'category',
				label: 'Pilih sebuah preset:',
				event: Twinkle.protect.callback.changePreset,
				list: mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate
			});

			field2 = new Morebits.QuickForm.Element({ type: 'field', label: 'Opsi perlindungan', name: 'field2' });
			field2.append({ type: 'div', name: 'currentprot', label: ' ' }); // holds the current protection level, as filled out by the async callback
			field2.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			// for existing pages
			if (mw.config.get('wgArticleId')) {
				field2.append({
					type: 'checkbox',
					event: Twinkle.protect.formevents.editmodify,
					list: [
						{
							label: 'Modifikasi perlindungan suntingan',
							name: 'editmodify',
							tooltip: 'Jika ini dimatikan, tingkat perlidungan suntingan, dan waktu kadaluwarsa, akan menyesuaikan dari yang sebelumnya.',
							checked: true
						}
					]
				});
				field2.append({
					type: 'select',
					name: 'editlevel',
					label: 'Siapa yang dapat menyunting:',
					event: Twinkle.protect.formevents.editlevel,
					// Filter TE outside of templates and modules
					list: Twinkle.protect.protectionLevels.filter((level) => isTemplate || level.value !== 'templateeditor')
				});
				field2.append({
					type: 'select',
					name: 'editexpiry',
					label: 'Kadaluwarsa:',
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
					},
					// default expiry selection (2 days) is conditionally set in Twinkle.protect.callback.changePreset
					list: Twinkle.protect.protectionLengths
				});
				field2.append({
					type: 'checkbox',
					event: Twinkle.protect.formevents.movemodify,
					list: [
						{
							label: 'Modifikasi perlindungan pemindahan',
							name: 'movemodify',
							tooltip: 'Jika opsi ini dimatikan, tingkat perlindungan pemindahan halaman dan jangka waktu kedaluwarsa akan ditinggalkan sebagaimana adanya.',
							checked: true
						}
					]
				});
				field2.append({
					type: 'select',
					name: 'movelevel',
					label: 'Siapa yang dapat memindahkan:',
					event: Twinkle.protect.formevents.movelevel,
					// Autoconfirmed is required for a move, redundant
					list: Twinkle.protect.protectionLevels.filter((level) => level.value !== 'autoconfirmed' && (isTemplate || level.value !== 'templateeditor'))
				});
				field2.append({
					type: 'select',
					name: 'moveexpiry',
					label: 'Kadaluawarsa:',
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
					},
					// default expiry selection (2 days) is conditionally set in Twinkle.protect.callback.changePreset
					list: Twinkle.protect.protectionLengths
				});
				if (hasFlaggedRevs) {
					field2.append({
						type: 'checkbox',
						event: Twinkle.protect.formevents.pcmodify,
						list: [
							{
								label: 'Modifikasi perlindungan perubahan tertunda',
								name: 'pcmodify',
								tooltip: 'Jika opsi ini dimatikan, tingkat perlindungan pemindahan halaman dan jangka waktu kedaluwarsa akan ditinggalkan sebagaimana adanya.',
								checked: true
							}
						]
					});
					field2.append({
						type: 'select',
						name: 'pclevel',
						label: 'Perubahan tertunda:',
						event: Twinkle.protect.formevents.pclevel,
						list: [
							{ label: 'Tidak ada', value: 'none' },
							{ label: 'Perubahan tertunda', value: 'autoconfirmed', selected: true }
						]
					});
					field2.append({
						type: 'select',
						name: 'pcexpiry',
						label: 'Kedaluwarsa:',
						event: function(e) {
							if (e.target.value === 'custom') {
								Twinkle.protect.doCustomExpiry(e.target);
							}
						},
						// default expiry selection (1 month) is conditionally set in Twinkle.protect.callback.changePreset
						list: Twinkle.protect.protectionLengths
					});
				}
			} else { // for non-existing pages
				field2.append({
					type: 'select',
					name: 'createlevel',
					label: 'Buat perlindungan:',
					event: Twinkle.protect.formevents.createlevel,
					// Filter TE always, and autoconfirmed in mainspace, redundant since WP:ACPERM
					list: Twinkle.protect.protectionLevels.filter((level) => level.value !== 'templateeditor' && (mw.config.get('wgNamespaceNumber') !== 0 || level.value !== 'autoconfirmed'))
				});
				field2.append({
					type: 'select',
					name: 'createexpiry',
					label: 'Kedaluwarsa:',
					event: function(e) {
						if (e.target.value === 'custom') {
							Twinkle.protect.doCustomExpiry(e.target);
						}
					},
					// default expiry selection (indefinite) is conditionally set in Twinkle.protect.callback.changePreset
					list: Twinkle.protect.protectionLengths
				});
			}
			field2.append({
				type: 'textarea',
				name: 'protectReason',
				label: 'Alasan (untuk catatan perlindungan):'
			});
			field2.append({
				type: 'div',
				name: 'protectReason_notes',
				label: 'Catatan:',
				style: 'display:inline-block; margin-top:4px;',
				tooltip: 'Menambahkan sebuah catatan unntuk catatan perlindungan yang diminta pada RfPP.'
			});
			field2.append({
				type: 'checkbox',
				event: Twinkle.protect.callback.annotateProtectReason,
				style: 'display:inline-block; margin-top:4px;',
				list: [
					{
						label: 'Permintaan RfPP',
						name: 'protectReason_notes_rfpp',
						checked: false,
						value: 'diminta pada [[WP:RfPP]]'
					}
				]
			});
			field2.append({
				type: 'input',
				event: Twinkle.protect.callback.annotateProtectReason,
				label: 'ID revisi RfPP',
				name: 'protectReason_notes_rfppRevid',
				value: '',
				tooltip: 'Revisi ID opsional dari halaman RfPP yang dimana perlingungan diminta.'
			});
			if (!mw.config.get('wgArticleId') || mw.config.get('wgPageContentModel') === 'Scribunto' || mw.config.get('wgNamespaceNumber') === 710) { // tagging isn't relevant for non-existing, module, or TimedText pages
				break;
			}
			/* falls through */
		case 'tag':
			field1 = new Morebits.QuickForm.Element({ type: 'field', label: 'Opsi tag', name: 'field1' });
			field1.append({ type: 'div', name: 'currentprot', label: ' ' }); // holds the current protection level, as filled out by the async callback
			field1.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			field1.append({
				type: 'select',
				name: 'tagtype',
				label: 'Pilih templat perlindungan:',
				list: Twinkle.protect.protectionTags,
				event: Twinkle.protect.formevents.tagtype
			});

			var isTemplateNamespace = mw.config.get('wgNamespaceNumber') === 10;
			var isAFD = Morebits.pageNameNorm.startsWith('Wikipedia:Wikipedia:Permintaan pelindungan halaman');
			var isCode = ['javascript', 'css', 'sanitized-css'].includes(mw.config.get('wgPageContentModel'));
			field1.append({
				type: 'checkbox',
				list: [
					{
						name: 'small',
						label: 'Iconify (small=yes)',
						tooltip: 'Akan menggunakan fitur |small=yes dari templat, dan hanya menapilkan sebagai kunci gembok',
						checked: true
					},
					{
						name: 'noinclude',
						label: 'Bungkus templat perlindungan dengan &lt;noinclude&gt;',
						tooltip: 'Akan membungkus templat perlindungan di tag &lt;noinclude&gt; , jadi tidak akan ditranslusikan',
						checked: (isTemplateNamespace || isAFD) && !isCode
					}
				]
			});
			break;

		case 'request':
			field_preset = new Morebits.QuickForm.Element({ type: 'field', label: 'Jenis perlindungan', name: 'field_preset' });
			field_preset.append({
				type: 'select',
				name: 'category',
				label: 'Jenis dan alasan:',
				event: Twinkle.protect.callback.changePreset,
				list: mw.config.get('wgArticleId') ? Twinkle.protect.protectionTypes : Twinkle.protect.protectionTypesCreate
			});

			field1 = new Morebits.QuickForm.Element({ type: 'field', label: 'Opsi', name: 'field1' });
			field1.append({ type: 'div', name: 'currentprot', label: ' ' }); // holds the current protection level, as filled out by the async callback
			field1.append({ type: 'div', name: 'hasprotectlog', label: ' ' });
			field1.append({
				type: 'select',
				name: 'expiry',
				label: 'Jangka waktu:',
				list: [
					{ label: '', selected: true, value: '' },
					{ label: 'Sementara', value: 'temporary' },
					{ label: 'Selamanya', value: 'infinity' }
				]
			});
			field1.append({
				type: 'textarea',
				name: 'reason',
				label: 'Alasan:'
			});
			break;
		default:
			alert("Kesalahan di twinkleprotect");
			break;
	}

	let oldfield;

	if (field_preset) {
		oldfield = $(e.target.form).find('fieldset[name="field_preset"]')[0];
		oldfield.parentNode.replaceChild(field_preset.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field_preset"]').css('display', 'none');
	}
	if (field1) {
		oldfield = $(e.target.form).find('fieldset[name="field1"]')[0];
		oldfield.parentNode.replaceChild(field1.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field1"]').css('display', 'none');
	}
	if (field2) {
		oldfield = $(e.target.form).find('fieldset[name="field2"]')[0];
		oldfield.parentNode.replaceChild(field2.render(), oldfield);
	} else {
		$(e.target.form).find('fieldset[name="field2"]').css('display', 'none');
	}

	if (e.target.values === 'protect') {
		// fake a change event on the preset dropdown
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		e.target.form.category.dispatchEvent(evt);

		// reduce vertical height of dialog
		$(e.target.form).find('fieldset[name="field2"] select').parent().css({ display: 'inline-block', marginRight: '0.5em' });
		$(e.target.form).find('fieldset[name="field2"] input[name="protectReason_notes_rfppRevid"]').parent().css({display: 'inline-block', marginLeft: '15px'}).hide();
	}

	// re-add protection level and log info, if it's available
	Twinkle.protect.callback.showLogAndCurrentProtectInfo();
};

// NOTE: This function is used by batchprotect as well
Twinkle.protect.formevents = {
	editmodify: function twinkleprotectFormEditmodifyEvent(e) {
		e.target.form.editlevel.disabled = !e.target.checked;
		e.target.form.editexpiry.disabled = !e.target.checked || (e.target.form.editlevel.value === 'all');
		e.target.form.editlevel.style.color = e.target.form.editexpiry.style.color = e.target.checked ? '' : 'transparent';
	},
	editlevel: function twinkleprotectFormEditlevelEvent(e) {
		e.target.form.editexpiry.disabled = e.target.value === 'all';
	},
	movemodify: function twinkleprotectFormMovemodifyEvent(e) {
		// sync move settings with edit settings if applicable
		if (e.target.form.movelevel.disabled && !e.target.form.editlevel.disabled) {
			e.target.form.movelevel.value = e.target.form.editlevel.value;
			e.target.form.moveexpiry.value = e.target.form.editexpiry.value;
		} else if (e.target.form.editlevel.disabled) {
			e.target.form.movelevel.value = 'sysop';
			e.target.form.moveexpiry.value = 'infinity';
		}
		e.target.form.movelevel.disabled = !e.target.checked;
		e.target.form.moveexpiry.disabled = !e.target.checked || (e.target.form.movelevel.value === 'all');
		e.target.form.movelevel.style.color = e.target.form.moveexpiry.style.color = e.target.checked ? '' : 'transparent';
	},
	movelevel: function twinkleprotectFormMovelevelEvent(e) {
		e.target.form.moveexpiry.disabled = e.target.value === 'all';
	},
	pcmodify: function twinkleprotectFormPcmodifyEvent(e) {
		e.target.form.pclevel.disabled = !e.target.checked;
		e.target.form.pcexpiry.disabled = !e.target.checked || (e.target.form.pclevel.value === 'none');
		e.target.form.pclevel.style.color = e.target.form.pcexpiry.style.color = e.target.checked ? '' : 'transparent';
	},
	pclevel: function twinkleprotectFormPclevelEvent(e) {
		e.target.form.pcexpiry.disabled = e.target.value === 'none';
	},
	createlevel: function twinkleprotectFormCreatelevelEvent(e) {
		e.target.form.createexpiry.disabled = e.target.value === 'all';
	},
	tagtype: function twinkleprotectFormTagtypeEvent(e) {
		e.target.form.small.disabled = e.target.form.noinclude.disabled = (e.target.value === 'none') || (e.target.value === 'noop');
	}
};

Twinkle.protect.doCustomExpiry = function twinkleprotectDoCustomExpiry(target) {
	const custom = prompt('Masukan sebuah waktu kadaluwarsa khusus.  \nAnda dapat menggunakan waktu relatif, seperti "1 menit" atau "19 hari", atau dengan stempel waktu "yyyymmddhhmm", seperti 201601010300 untuk 1 Januari 2016 pukul 3.00 GMT).', '');
	if (custom) {
		const option = document.createElement('option');
		option.setAttribute('value', custom);
		option.textContent = custom;
		target.appendChild(option);
		target.value = custom;
	} else {
		target.selectedIndex = 0;
	}
};

// NOTE: This list is used by batchprotect as well
Twinkle.protect.protectionLevels = [
	{ label: 'Semua', value: 'all' },
	{ label: 'Terkonfirmasik otomatis', value: 'autoconfirmed' },
	{ label: 'Terkonfirmasi lanjutan', value: 'extendedconfirmed' },
	{ label: 'Penyunting templat', value: 'templateeditor' },
	{ label: 'Sysop', value: 'sysop', selected: true }
];

// default expiry selection is conditionally set in Twinkle.protect.callback.changePreset
// NOTE: This list is used by batchprotect as well
Twinkle.protect.protectionLengths = [
	{ label: '1 jam', value: '1 hour' },
	{ label: '2 jam', value: '2 hours' },
	{ label: '3 jam', value: '3 hours' },
	{ label: '6 jam', value: '6 hours' },
	{ label: '12 jam', value: '12 hours' },
	{ label: '1 hari', value: '1 day' },
	{ label: '2 hari', value: '2 days' },
	{ label: '3 hari', value: '3 days' },
	{ label: '4 hari', value: '4 days' },
	{ label: '1 minggu', value: '1 week' },
	{ label: '2 minggu', value: '2 weeks' },
	{ label: '1 bulan', value: '1 month' },
	{ label: '2 bulan', value: '2 months' },
	{ label: '3 bulan', value: '3 months' },
	{ label: '1 tahun', value: '1 year' },
	{ label: 'tak terbatas', value: 'indefinite' },
	{ label: 'Lain-lain...', value: 'custom' }
];

Twinkle.protect.protectionTypes = [
	{ label: 'Menghapus perlindungan', value: 'unprotect' },
	{
		label: 'Perlindungan penuh',
		list: [
			{ label: 'Bawaan (penuh)', value: 'pp-protected' },
			{ label: 'Isi yang dipertentangkan/perang suntingan (penuh)', value: 'pp-dispute' },
			{ label: 'Vandalisme berulang (penuh)', value: 'pp-vandalism' },
			{ label: 'Pembicaraan pengguna yang diblokir (penuh)', value: 'pp-usertalk' }
		]
	},
	{
		label: 'perlindungan templat',
		list: [
			{ label: 'Templat yang sering dipakai', value: 'pp-template' }
		]
	},
	{
		label: 'Perlindungan terkonfirmasi lanjutan',
		list: [
			{ label: 'Umum (ECP)', value: 'pp-30-500' },
			{ label: 'Arbitration enforcement (ECP)', selected: true, value: 'pp-30-500-arb' },
			{ label: 'Persistent vandalism (ECP)', value: 'pp-30-500-vandalism' },
			{ label: 'Suntingan mengganggu (ECP)', value: 'pp-30-500-disruptive' },
			{ label: 'Pelanggaran kebijakan BLP (ECP)', value: 'pp-30-500-blp' },
			{ label: 'Pelaggaran akun ganda (ECP)', value: 'pp-30-500-sock' }
		]
	},
	{
		label: 'Perlindungan sebagian',
		list: [
			{ label: 'Bawaan (semi)', value: 'pp-semi-protected' },
			{ label: 'Vandalisme berulang (semi)', selected: true, value: 'pp-semi-vandalism' },
			{ label: 'Suntingan merusak (semi)', value: 'pp-semi-disruptive' },
			{ label: 'Penambahan isi tanpa sumber (semi)', value: 'pp-semi-unsourced' },
			{ label: 'Melanggar kebijakan BLP (semi)', value: 'pp-semi-blp' },
			{ label: 'Penggunaan akun boneka (semi)', value: 'pp-semi-sock' },
			{ label: 'Pembicaraan pengguna yang diblokir (semi)', value: 'pp-semi-usertalk' }
		]
	},
	{
		label: 'Perubahan tertunda',
		list: [
			{ label: 'Bawaan (PT)', value: 'pp-pc-protected' },
			{ label: 'Vandalisme berulang (PT)', value: 'pp-pc-vandalism' },
			{ label: 'Suntingan merusak (PT)', value: 'pp-pc-disruptive' },
			{ label: 'Penambahan isi tanpa sumber (PT)', value: 'pp-pc-unsourced' },
			{ label: 'Penyalahgunaan kebijakan BLP (PT)', value: 'pp-pc-blp' }
		]
	},
	{
		label: 'Perlindungan pemindahan',
		list: [
			{ label: 'Bawaan (pemindahan)', value: 'pp-move' },
			{ label: 'Isi yang dipertentangkan/perang suntingan (pemindahan)', value: 'pp-move-dispute' },
			{ label: 'Vandalisme pemindahan halaman (pemindahan)', value: 'pp-move-vandalism' },
			{ label: 'Halaman yang banyak ditampilkan (pemindahan)', value: 'pp-move-indef' }
		]
	}
]
// Filter for templates and flaggedrevs
.filter((type) => (isTemplate || type.label !== 'Perlindungan templat') && (hasFlaggedRevs || type.label !== 'Perubahan tertunda'));

Twinkle.protect.protectionTypesCreate = [
	{ label: 'Hapus perlindungan', value: 'unprotect' },
	{
		label: 'Buat perlindungan',
		list: [
			{ label: 'Bawaan ({{pp-create}})', value: 'pp-create' },
			{ label: 'Judul halaman yang menghasut', value: 'pp-create-offensive' },
			{ label: 'Pembuatan halaman berulang', selected: true, value: 'pp-create-salt' },
			{ label: 'Halaman biografi orang hidup yang dibuat kembali', value: 'pp-create-blp' }
		]
	}
];

// A page with both regular and PC protection will be assigned its regular
// protection weight plus 2
Twinkle.protect.protectionWeight = {
	sysop: 40,
	templateeditor: 30,
	extendedconfirmed: 20,
	autoconfirmed: 10,
	flaggedrevs_autoconfirmed: 5, // Pending Changes protection alone
	all: 0,
	flaggedrevs_none: 0 // just in case
};

// NOTICE: keep this synched with [[MediaWiki:Protect-dropdown]]
// Also note: stabilize = Pending Changes level
// expiry will override any defaults
Twinkle.protect.protectionPresetsInfo = {
	'pp-protected': {
		edit: 'sysop',
		move: 'sysop',
		reason: null
	},
	'pp-dispute': {
		edit: 'sysop',
		move: 'sysop',
		reason: 'Perang suntingan/isi yang dipertentangkan'
	},
	'pp-vandalism': {
		edit: 'sysop',
		move: 'sysop',
		reason: '[[WP:Vandalism|Vandalisme]] yang berulang-ulang'
	},
	'pp-usertalk': {
		edit: 'sysop',
		move: 'sysop',
		expiry: 'infinity',
		reason: '[[WP:PP#Talk-page protection|Penyalahgunaan halaman pembicaraan pengguna saat diblokir]]'
	},
	'pp-template': {
		edit: 'templateeditor',
		move: 'templateeditor',
		expiry: 'infinity',
		reason: '[[WP:High-risk templates|Templat yang sering digunakan]]'
	},
	'pp-30-500-arb': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		expiry: 'infinity',
		reason: '[[WP:30/500|Arbitration enforcement]]',
		template: 'pp-extended'
	},
	'pp-30-500-vandalism': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		reason: '[[WP:Vandalism|Vandalisme]] berulang dari pengguna terkonfirmasi (otomatis)',
		template: 'pp-extended'
	},
	'pp-30-500-disruptive': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		reason: '[[WP:Disruptive editing|Suntingan mengganggu]] berulang dari pengguna terkonfirmasi (otomatis) ',
		template: 'pp-extended'
	},
	'pp-30-500-blp': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		reason: 'Pelanggaran [[WP:BLP|kebijakan biografi orang yang masih hidup]] berulang dari pengguna terkonfirmasi (otomatis)',
		template: 'pp-extended'
	},
	'pp-30-500-sock': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		reason: '[[WP:Sock puppetry|Penyalagunaan akun ganda]] berulang',
		template: 'pp-extended'
	},
	'pp-30-500': {
		edit: 'extendedconfirmed',
		move: 'extendedconfirmed',
		reason: null,
		template: 'pp-extended'
	},
	'pp-semi-vandalism': {
		edit: 'autoconfirmed',
		reason: '[[WP:Vandalism|Vandalisme]] berulang',
		template: 'pp-vandalism'
	},
	'pp-semi-disruptive': {
		edit: 'autoconfirmed',
		reason: '[[WP:Disruptive editing|Penyuntingan yang mengganggu]] berulang',
		template: 'pp-protected'
	},
	'pp-semi-unsourced': {
		edit: 'autoconfirmed',
		reason: 'Penambahan [[WP:INTREF|konten yang mempunyai sumber buruk atau kurang]] berulang',
		template: 'pp-protected'
	},
	'pp-semi-blp': {
		edit: 'autoconfirmed',
		reason: '[[WP:BLP|Pelanggaran kebijakan biografi orang yang masih hidup]]',
		template: 'pp-blp'
	},
	'pp-semi-usertalk': {
		edit: 'autoconfirmed',
		move: 'autoconfirmed',
		expiry: 'infinity',
		reason: '[[WP:PP#Talk-page protection|Penggunaan tidak sesuai dari halaman pembicaraan pengguna sementara diblokir]]',
		template: 'pp-usertalk'
	},
	'pp-semi-template': { // removed for now
		edit: 'autoconfirmed',
		move: 'autoconfirmed',
		expiry: 'infinity',
		reason: '[[WP:High-risk templates|Templat berisiko tinggi]]',
		template: 'pp-template'
	},
	'pp-semi-sock': {
		edit: 'autoconfirmed',
		reason: '[[WP:Sock puppetry|Penyalagunaan akun ganda]] berulang',
		template: 'pp-sock'
	},
	'pp-semi-protected': {
		edit: 'autoconfirmed',
		reason: null,
		template: 'pp-protected'
	},
	'pp-pc-vandalism': {
		stabilize: 'autoconfirmed', // stabilize = Pending Changes
		reason: '[[WP:Vandalism|Vandalisme]] berulang',
		template: 'pp-pc'
	},
	'pp-pc-disruptive': {
		stabilize: 'autoconfirmed',
		reason: '[[WP:Disruptive editing|Penyuntingan yang mengganggu]] berulang',
		template: 'pp-pc'
	},
	'pp-pc-unsourced': {
		stabilize: 'autoconfirmed',
		reason: 'Penambahan [[WP:INTREF|konten yang mempunyai sumber buruk atau kurang]] berulang',
		template: 'pp-pc'
	},
	'pp-pc-blp': {
		stabilize: 'autoconfirmed',
		reason: 'Pelanggaran [[WP:BIO|kebijakan orang yang masih hidup]]',
		template: 'pp-pc'
	},
	'pp-pc-protected': {
		stabilize: 'autoconfirmed',
		reason: null,
		template: 'pp-pc'
	},
	'pp-move': {
		move: 'sysop',
		reason: null
	},
	'pp-move-dispute': {
		move: 'sysop',
		reason: '[[WP:MOVP|Perang pemindahan halaman]]'
	},
	'pp-move-vandalism': {
		move: 'sysop',
		reason: '[[WP:MOVP|Vandalsime pemindahan halaman]]'
	},
	'pp-move-indef': {
		move: 'sysop',
		expiry: 'infinity',
		reason: '[[WP:MOVP|Halaman berisiko tinggi]]'
	},
	unprotect: {
		edit: 'all',
		move: 'all',
		stabilize: 'none',
		create: 'all',
		reason: null,
		template: 'none'
	},
	'pp-create-offensive': {
		create: 'sysop',
		reason: '[[WP:SALT|Nama yang menghasut]]'
	},
	'pp-create-salt': {
		create: 'extendedconfirmed',
		reason: '[[WP:SALT|Dibuat ulang berulang kali]]'
	},
	'pp-create-blp': {
		create: 'extendedconfirmed',
		reason: '[[WP:BLPDEL|Baru saja dihapus BIO]]'
	}
};

Twinkle.protect.protectionTags = [
	{
		label: 'None (hilangkan templat yang sudah ad)',
		value: 'none'
	},
	{
		label: 'None (jangan menghilangkan templat yang sudah ada)',
		value: 'noop'
	},
	{
		label: 'Sunting templat perlindungan',
		list: [
			{ label: '{{pp-vandalism}}: vandalisme', value: 'pp-vandalism' },
			{ label: '{{pp-dispute}}: perang suntingan', value: 'pp-dispute' },
			{ label: '{{pp-blp}}: pelanggaran BIO', value: 'pp-blp' },
			{ label: '{{pp-sock}}: penyalahgunaan akun ganda', value: 'pp-sock' },
			{ label: '{{pp-template}}: templat berisiko tinggi', value: 'pp-template' },
			{ label: '{{pp-usertalk}}: pembicaraan pengguna terblokir', value: 'pp-usertalk' },
			{ label: '{{pp-protected}}: perlindungan umum', value: 'pp-protected' },
			{ label: '{{pp-semi-indef}}: perlindungan semi jangka panjang umum', value: 'pp-semi-indef' },
			{ label: '{{pp-extended}}: perlindungan terkonfirmasi lanjutan', value: 'pp-extended' }
		]
	},
	{
		label: 'Templat perubahan tertunda',
		list: [
			{ label: '{{pp-pc}}: perubahan tertunda', value: 'pp-pc' }
		]
	},
	{
		label: 'Templat perlindungan pemindahan halaman',
		list: [
			{ label: '{{pp-move-dispute}}: perang pemindahan', value: 'pp-move-dispute' },
			{ label: '{{pp-move-vandalism}}: vandalisme pindah-halaman', value: 'pp-move-vandalism' },
			{ label: '{{pp-move-indef}}: jangka panjang umum', value: 'pp-move-indef' },
			{ label: '{{pp-move}}: lainnya', value: 'pp-move' }
		]
	}
]
// Filter FlaggedRevs
.filter((type) => hasFlaggedRevs || type.label !== 'Templat perubahan tertunda');

Twinkle.protect.callback.changePreset = function twinkleprotectCallbackChangePreset(e) {
	const form = e.target.form;

	const actiontypes = form.actiontype;
	let actiontype;
	for (let i = 0; i < actiontypes.length; i++) {
		if (!actiontypes[i].checked) {
			continue;
		}
		actiontype = actiontypes[i].values;
		break;
	}

	if (actiontype === 'protect') { // actually protecting the page
		const item = Twinkle.protect.protectionPresetsInfo[form.category.value];

		if (mw.config.get('wgArticleId')) {
			if (item.edit) {
				form.editmodify.checked = true;
				Twinkle.protect.formevents.editmodify({ target: form.editmodify });
				form.editlevel.value = item.edit;
				Twinkle.protect.formevents.editlevel({ target: form.editlevel });
			} else {
				form.editmodify.checked = false;
				Twinkle.protect.formevents.editmodify({ target: form.editmodify });
			}

			if (item.move) {
				form.movemodify.checked = true;
				Twinkle.protect.formevents.movemodify({ target: form.movemodify });
				form.movelevel.value = item.move;
				Twinkle.protect.formevents.movelevel({ target: form.movelevel });
			} else {
				form.movemodify.checked = false;
				Twinkle.protect.formevents.movemodify({ target: form.movemodify });
			}

			form.editexpiry.value = form.moveexpiry.value = item.expiry || '2 days';

			if (form.pcmodify) {
				if (item.stabilize) {
					form.pcmodify.checked = true;
					Twinkle.protect.formevents.pcmodify({ target: form.pcmodify });
					form.pclevel.value = item.stabilize;
					Twinkle.protect.formevents.pclevel({ target: form.pclevel });
				} else {
					form.pcmodify.checked = false;
					Twinkle.protect.formevents.pcmodify({ target: form.pcmodify });
				}
				form.pcexpiry.value = item.expiry || '1 month';
			}
		} else {
			if (item.create) {
				form.createlevel.value = item.create;
				Twinkle.protect.formevents.createlevel({ target: form.createlevel });
			}
			form.createexpiry.value = item.expiry || 'infinity';
		}

		const reasonField = actiontype === 'protect' ? form.protectReason : form.reason;
		if (item.reason) {
			reasonField.value = item.reason;
		} else {
			reasonField.value = '';
		}
		// Add any annotations
		Twinkle.protect.callback.annotateProtectReason(e);

		// sort out tagging options, disabled if nonexistent, lua, or TimedText
		if (mw.config.get('wgArticleId') && mw.config.get('wgPageContentModel') !== 'Scribunto' && mw.config.get('wgNamespaceNumber') !== 710) {
			if (form.category.value === 'unprotect') {
				form.tagtype.value = 'none';
			} else {
				form.tagtype.value = item.template ? item.template : form.category.value;
			}
			Twinkle.protect.formevents.tagtype({ target: form.tagtype });

			// Default settings for adding <noinclude> tags to protection templates
			const isTemplateEditorProtection = form.category.value === 'pp-template';
			const isAFD = Morebits.pageNameNorm.startsWith('Wikipedia:Wikipedia:Usulan penghapusan/');
			const isNotTemplateNamespace = mw.config.get('wgNamespaceNumber') !== 10;
			const isCode = ['javascript', 'css', 'sanitized-css'].includes(mw.config.get('wgPageContentModel'));
			if ((isTemplateEditorProtection || isAFD) && !isCode) {
				form.noinclude.checked = true;
			} else if (isCode || isNotTemplateNamespace) {
				form.noinclude.checked = false;
			}
		}

	} else { // RPP request
		if (form.category.value === 'unprotect') {
			form.expiry.value = '';
			form.expiry.disabled = true;
		} else {
			form.expiry.value = '';
			form.expiry.disabled = false;
		}
	}
};

Twinkle.protect.callback.evaluate = function twinkleprotectCallbackEvaluate(e) {
	const form = e.target;
	const input = Morebits.QuickForm.getInputData(form);

	let tagparams;
	if (input.actiontype === 'tag' || (input.actiontype === 'protect' && mw.config.get('wgArticleId') && mw.config.get('wgPageContentModel') !== 'Scribunto' && mw.config.get('wgNamespaceNumber') !== 710 /* TimedText */)) {
		tagparams = {
			tag: input.tagtype,
			reason: false,
			small: input.small,
			noinclude: input.noinclude
		};
	}

	switch (input.actiontype) {
		case 'protect':
			// protect the page
			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			Morebits.wiki.actionCompleted.notice = 'Perlindungan selesai';

			var statusInited = false;
			var thispage;

			var allDone = function twinkleprotectCallbackAllDone() {
				if (thispage) {
					thispage.getStatusElement().info('done');
				}
				if (tagparams) {
					Twinkle.protect.callbacks.taggingPageInitial(tagparams);
				}
			};

			var protectIt = function twinkleprotectCallbackProtectIt(next) {
				thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'Melindungi halaman');
				if (mw.config.get('wgArticleId')) {
					if (input.editmodify) {
						thispage.setEditProtection(input.editlevel, input.editexpiry);
					}
					if (input.movemodify) {
						// Ensure a level has actually been chosen
						if (input.movelevel) {
							thispage.setMoveProtection(input.movelevel, input.moveexpiry);
						} else {
							alert('Anda harus memilih sebuah tingkat perlidungan pemindahan!');
							return;
						}
					}
					thispage.setWatchlist(Twinkle.getPref('watchProtectedPages'));
				} else {
					thispage.setCreateProtection(input.createlevel, input.createexpiry);
					thispage.setWatchlist(false);
				}

				if (input.protectReason) {
					thispage.setEditSummary(input.protectReason);
				} else {
					alert('Anda harus memasukan alasan perlindungan, yang akan dicatat di catatan perlindungan.');
					return;
				}

				if (input.protectReason_notes_rfppRevid && !/^\d+$/.test(input.protectReason_notes_rfppRevid)) {
					alert(' ID revisi yang diberikan tidak sesuai. Tolong lihat https://en.wikipedia.org/wiki/Help:Permanent_link untuk informasi dalam mencari ID yang tepat (juga dikenal sebagai "oldid").');
					return;
				}

				if (!statusInited) {
					Morebits.SimpleWindow.setButtonsEnabled(false);
					Morebits.Status.init(form);
					statusInited = true;
				}

				thispage.setChangeTags(Twinkle.changeTags);
				thispage.protect(next);
			};

			var stabilizeIt = function twinkleprotectCallbackStabilizeIt() {
				if (thispage) {
					thispage.getStatusElement().info('done');
				}

				thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'Menambahkan perlindungan perubahan tertunda');
				thispage.setFlaggedRevs(input.pclevel, input.pcexpiry);

				if (input.protectReason) {
					thispage.setEditSummary(input.protectReason + Twinkle.summaryAd); // flaggedrevs tag support: [[phab:T247721]]
				} else {
					alert('Anda harus memasukan alasan perlindungan, yang akan dicatat di catatan perlindungan.');
					return;
				}

				if (!statusInited) {
					Morebits.SimpleWindow.setButtonsEnabled(false);
					Morebits.Status.init(form);
					statusInited = true;
				}

				thispage.setWatchlist(Twinkle.getPref('watchProtectedPages'));
				thispage.stabilize(allDone, (error) => {
					if (error.errorCode === 'stabilize_denied') { // [[phab:T234743]]
						thispage.getStatusElement().error('Gagal mencoba untuk memodifikasi pengaturan perubahan tertunda, sepertinya galat pada Mediawiki. Tindakan lainnya (menandai atau perlindungan biasa) mungkin telah dilakukan. Tolong muat kembali halamannya dan coba lagi.');
					}
				});
			};

			if (input.editmodify || input.movemodify || !mw.config.get('wgArticleId')) {
				if (input.pcmodify) {
					protectIt(stabilizeIt);
				} else {
					protectIt(allDone);
				}
			} else if (input.pcmodify) {
				stabilizeIt();
			} else {
				alert("Tolong berikan Twinkle untuk lakukan sesuatu! \nJika anda hanya ingin menandai halamannya, anda dapat memilih opsi 'tempat proteksi dengan tag halaman'diatas.");
			}

			break;

		case 'tag':
			// apply a protection template

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			Morebits.wiki.actionCompleted.followRedirect = false;
			Morebits.wiki.actionCompleted.notice = 'Menandai selesai';

			Twinkle.protect.callbacks.taggingPageInitial(tagparams);
			break;

		case 'request':
			// file request at RFPP
			var typename, typereason;
			switch (input.category) {
				case 'pp-dispute':
				case 'pp-vandalism':
				case 'pp-usertalk':
				case 'pp-protected':
					typename = 'full protection';
					break;
				case 'pp-template':
					typename = 'template protection';
					break;
				case 'pp-30-500-arb':
				case 'pp-30-500-vandalism':
				case 'pp-30-500-disruptive':
				case 'pp-30-500-blp':
				case 'pp-30-500-sock':
				case 'pp-30-500':
					typename = 'extended confirmed protection';
					break;
				case 'pp-semi-vandalism':
				case 'pp-semi-disruptive':
				case 'pp-semi-unsourced':
				case 'pp-semi-usertalk':
				case 'pp-semi-sock':
				case 'pp-semi-blp':
				case 'pp-semi-protected':
					typename = 'semi-protection';
					break;
				case 'pp-pc-vandalism':
				case 'pp-pc-blp':
				case 'pp-pc-protected':
				case 'pp-pc-unsourced':
				case 'pp-pc-disruptive':
					typename = 'pending changes';
					break;
				case 'pp-move':
				case 'pp-move-dispute':
				case 'pp-move-indef':
				case 'pp-move-vandalism':
					typename = 'move protection';
					break;
				case 'pp-create-offensive':
				case 'pp-create-blp':
				case 'pp-create-salt':
					typename = 'create protection';
					break;
				case 'unprotect':
					var admins = $.map(Twinkle.protect.currentProtectionLevels, (pl) => {
						if (!pl.admin || Twinkle.protect.trustedBots.includes(pl.admin)) {
							return null;
						}
						return 'User:' + pl.admin;
					});
					if (admins.length && !confirm('Apakah anda telah menghubungi pengurus (' + Morebits.array.uniq(admins).join(', ') + ') yang melindungi dahulu?')) {
						return false;
					}
					// otherwise falls through
				default:
					typename = 'unprotection';
					break;
			}
			switch (input.category) {
				case 'pp-dispute':
					typereason = 'Perang suntingan/isi yang dipertentangkan';
					break;
				case 'pp-vandalism':
				case 'pp-semi-vandalism':
				case 'pp-pc-vandalism':
				case 'pp-30-500-vandalism':
					typereason = '[[WP:VAND|Vandalisme]] berulang';
					break;
				case 'pp-semi-disruptive':
				case 'pp-pc-disruptive':
				case 'pp-30-500-disruptive':
					typereason = '[[Wikipedia:Disruptive editing|Penyuntingan mengganggu]] berulang';
					break;
				case 'pp-semi-unsourced':
				case 'pp-pc-unsourced':
					typereason = 'Penambahan [[WP:INTREF|konten yang sumbernya kurang atau buruk]] berulang';
					break;
				case 'pp-template':
					typereason = '[[WP:Templat berisiko tnggi|Templat berisiko tinggi]]';
					break;
				case 'pp-30-500-arb':
					typereason = '[[WP:30/500|Arbitration enforcement]]';
					break;
				case 'pp-usertalk':
				case 'pp-semi-usertalk':
					typereason = 'Penggunaan tidak semestinya saat diblokir';
					break;
				case 'pp-semi-sock':
				case 'pp-30-500-sock':
					typereason = '[[WP:SOCK|sockpuppetry]]';
					break;
				case 'pp-semi-blp':
				case 'pp-pc-blp':
				case 'pp-30-500-blp':
					typereason = 'Pelanggaran kebijakan [[WP:BLP|BLP]]';
					break;
				case 'pp-move-dispute':
					typereason = 'Perang pemindahan halaman';
					break;
				case 'pp-move-vandalism':
					typereason = 'Vandalisme pemindahan halaman';
					break;
				case 'pp-move-indef':
					typereason = 'Halaman yang banyak ditampilkan';
					break;
				case 'pp-create-offensive':
					typereason = 'Nama yang menyinggung';
					break;
				case 'pp-create-blp':
					typereason = 'Baru saja dihapus [[WP:BLP|BLP]]';
					break;
				case 'pp-create-salt':
					typereason = 'Dibuat berulang kali';
					break;
				default:
					typereason = '';
					break;
			}

			var reason = typereason;
			if (input.reason !== '') {
				if (typereason !== '') {
					reason += '\u00A0\u2013 '; // U+00A0 NO-BREAK SPACE; U+2013 EN RULE
				}
				reason += input.reason;
			}
			if (reason !== '' && reason.charAt(reason.length - 1) !== '.') {
				reason += '.';
			}

			var rppparams = {
				reason: reason,
				typename: typename,
				category: input.category,
				expiry: input.expiry
			};

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			var rppName = 'Wikipedia:RPP';

			// Updating data for the action completed event
			Morebits.wiki.actionCompleted.redirect = 'Wikipedia: RPP';
			Morebits.wiki.actionCompleted.notice = 'Pemberian selesai, mengalihkan ke halaman diskusi';

			var rppPage = new Morebits.wiki.Page(rppName, 'Meminta perlindungan halaman');
			rppPage.setFollowRedirect(true);
			rppPage.setCallbackParameters(rppparams);
			rppPage.load(Twinkle.protect.callbacks.fileRequest);
			break;
		default:
			alert('twinkleprotect: tindakan tidak diketahui');
			break;
	}
};

Twinkle.protect.protectReasonAnnotations = [];
Twinkle.protect.callback.annotateProtectReason = function twinkleprotectCallbackAnnotateProtectReason(e) {
	const form = e.target.form;
	const protectReason = form.protectReason.value.replace(new RegExp('(?:; )?' + mw.util.escapeRegExp(Twinkle.protect.protectReasonAnnotations.join(': '))), '');

	if (this.name === 'protectReason_notes_rfpp') {
		if (this.checked) {
			Twinkle.protect.protectReasonAnnotations.push(this.value);
			$(form.protectReason_notes_rfppRevid).parent().show();
		} else {
			Twinkle.protect.protectReasonAnnotations = [];
			form.protectReason_notes_rfppRevid.value = '';
			$(form.protectReason_notes_rfppRevid).parent().hide();
		}
	} else if (this.name === 'protectReason_notes_rfppRevid') {
		Twinkle.protect.protectReasonAnnotations = Twinkle.protect.protectReasonAnnotations.filter((el) => !el.includes('[[Istimewa:Permalink'));
		if (e.target.value.length) {
			const permalink = '[[Istimewa:Permalink/' + e.target.value + '#' + Morebits.pageNameNorm + ']]';
			Twinkle.protect.protectReasonAnnotations.push(permalink);
		}
	}

	if (!Twinkle.protect.protectReasonAnnotations.length) {
		form.protectReason.value = protectReason;
	} else {
		form.protectReason.value = (protectReason ? protectReason + '; ' : '') + Twinkle.protect.protectReasonAnnotations.join(': ');
	}
};

Twinkle.protect.callbacks = {
	taggingPageInitial: function(tagparams) {
		if (tagparams.tag === 'noop') {
			Morebits.Status.info('Menambahkan templat perlindungan', 'tidak ada yang dilakukan');
			return;
		}

		const protectedPage = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'Menandai halaman');
		protectedPage.setCallbackParameters(tagparams);
		protectedPage.load(Twinkle.protect.callbacks.taggingPage);
	},
	taggingPage: function(protectedPage) {
		const params = protectedPage.getCallbackParameters();
		let text = protectedPage.getPageText();
		let tag, summary;

		const oldtag_re = /(?:\/\*)?\s*(?:<noinclude>)?\s*\{\{\s*(pp-[^{}]*?|protected|(?:t|v|s|p-|usertalk-v|usertalk-s|sb|move)protected(?:2)?|protected template|privacy protection)\s*?\}\}\s*(?:<\/noinclude>)?\s*(?:\*\/)?\s*/gi;
		const re_result = oldtag_re.exec(text);
		if (re_result) {
			if (params.tag === 'none' || confirm('{{' + re_result[1] + '}} ditemukan di halaman. \Tekan OK untuk menghilangkannya, aau tekan Batal untuk membiarkannya.')) {
				text = text.replace(oldtag_re, '');
			}
		}

		if (params.tag === 'none') {
			summary = 'Menghilangkan templat pelindungan halaman';
		} else {
			tag = params.tag;
			if (params.reason) {
				tag += '|reason=' + params.reason;
			}
			if (params.small) {
				tag += '|small=yes';
			}

			if (/^\s*#redirect/i.test(text)) { // redirect page
				// Only tag if no {{rcat shell}} is found
				if (!text.match(/{{(?:redr|this is a redirect|r(?:edirect)?(?:.?cat.*)?[ _]?sh)/i)) {
					text = text.replace(/#REDIRECT ?(\[\[.*?\]\])(.*)/i, '#ALIH $1$2\n\n{{' + tag + '}}');
				} else {
					Morebits.Status.info('Redirect category shell present', 'tidak ada yang dilakukan');
					return;
				}
			} else {
				const needsTagToBeCommentedOut = ['javascript', 'css', 'sanitized-css'].includes(protectedPage.getContentModel());
				if (needsTagToBeCommentedOut) {
					if (params.noinclude) {
						tag = '/* <noinclude>{{' + tag + '}}</noinclude> */';
					} else {
						tag = '/* {{' + tag + '}} */\n';
					}

					// Prepend tag at very top
					text = tag + text;
				} else {
					if (params.noinclude) {
						tag = '<noinclude>{{' + tag + '}}</noinclude>';

						if (text.startsWith('==')) {
							tag += '\n'; // a newline is needed to prevent section headings at the very beginning of the page from breaking
						}
					} else {
						tag = '{{' + tag + '}}\n';
					}

					// Insert tag after short description or any hatnotes
					const wikipage = new Morebits.wikitext.Page(text);
					text = wikipage.insertAfterTemplates(tag, Twinkle.hatnoteRegex).getText();
				}
			}
			summary = 'Menambahkan {{' + params.tag + '}}';
		}

		protectedPage.setEditSummary(summary);
		protectedPage.setChangeTags(Twinkle.changeTags);
		protectedPage.setWatchlist(Twinkle.getPref('watchPPTaggedPages'));
		protectedPage.setPageText(text);
		protectedPage.setCreateOption('nocreate');
		protectedPage.suppressProtectWarning(); // no need to let admins know they are editing through protection
		protectedPage.save();
	},

	fileRequest: function(rppPage) {

		const rppPage2 = new Morebits.wiki.Page('Wikipedia:RPP', 'Memuat halaman permintaan');
		rppPage2.load(() => {
			const params = rppPage.getCallbackParameters();
			let text = rppPage.getPageText();
			const statusElement = rppPage.getStatusElement();
			let text2 = rppPage2.getPageText();

			const rppRe = new RegExp('===\\s*(\\[\\[)?\\s*:?\\s*' + Morebits.string.escapeRegExp(Morebits.pageNameNorm) + '\\s*(\\]\\])?\\s*===', 'm');
			const tag = rppRe.exec(text) || rppRe.exec(text2);

			const rppLink = document.createElement('a');
			rppLink.setAttribute('href', mw.util.getUrl('Wikipedia:RPP'));
			rppLink.appendChild(document.createTextNode('Wikipedia:Permintaan pelindungan halaman'));

			if (tag) {
				statusElement.error([ 'Sudah terdapat permintaan perlindungan untuk halaman ini di ', rppLink, ', membatalkan.' ]);
				return;
			}

			let newtag = '=== [[:' + Morebits.pageNameNorm + ']] ===\n';
			if (new RegExp('^' + mw.util.escapeRegExp(newtag).replace(/\s+/g, '\\s*'), 'm').test(text) || new RegExp('^' + mw.util.escapeRegExp(newtag).replace(/\s+/g, '\\s*'), 'm').test(text2)) {
				statusElement.error([ 'Sudah terdapat permintaan perlindungan untuk halaman ini di ', rppLink, ', membatalkan.' ]);
				return;
			}
			newtag += '* {{pagelinks|1=' + Morebits.pageNameNorm + '}}\n\n';

			let words;
			switch (params.expiry) {
				case 'temporary':
					words = 'Sementara ';
					break;
				case 'infinity':
					words = 'Selamanya ';
					break;
				default:
					words = '';
					break;
			}

			words += params.typename;

			newtag += "'''" + Morebits.string.toUpperCaseFirstChar(words) + (params.reason !== '' ? ":''' " +
				Morebits.string.formatReasonText(params.reason) : ".'''") + ' ~~~~';

			// If either protection type results in a increased status, then post it under increase
			// else we post it under decrease
			let increase = false;
			const protInfo = Twinkle.protect.protectionPresetsInfo[params.category];

			// function to compute protection weights (see comment at Twinkle.protect.protectionWeight)
			const computeWeight = function(mainLevel, stabilizeLevel) {
				let result = Twinkle.protect.protectionWeight[mainLevel || 'all'];
				if (stabilizeLevel) {
					if (result) {
						if (stabilizeLevel.level === 'autoconfirmed') {
							result += 2;
						}
					} else {
						result = Twinkle.protect.protectionWeight['flaggedrevs_' + stabilizeLevel];
					}
				}
				return result;
			};

			// compare the page's current protection weights with the protection we are requesting
			const editWeight = computeWeight(Twinkle.protect.currentProtectionLevels.edit &&
				Twinkle.protect.currentProtectionLevels.edit.level,
			Twinkle.protect.currentProtectionLevels.stabilize &&
				Twinkle.protect.currentProtectionLevels.stabilize.level);
			if (computeWeight(protInfo.edit, protInfo.stabilize) > editWeight ||
				computeWeight(protInfo.move) > computeWeight(Twinkle.protect.currentProtectionLevels.move &&
				Twinkle.protect.currentProtectionLevels.move.level) ||
				computeWeight(protInfo.create) > computeWeight(Twinkle.protect.currentProtectionLevels.create &&
				Twinkle.protect.currentProtectionLevels.create.level)) {
				increase = true;
			}

			if (increase) {
				const originalTextLength = text.length;
				text += '\n' + newtag;
				if (text.length === originalTextLength) {
					const linknode = document.createElement('a');
					linknode.setAttribute('href', mw.util.getUrl('Wikipedia:Twinkle/Fixing RPP'));
					linknode.appendChild(document.createTextNode('Bagaimana cara memperbaiki RPP'));
					statusElement.error([ 'Tidak dapat menemukan heading terkait di WP:RPP. Untuk memperbaiki masalah ini, tolong lihat ', linknode, '.' ]);
					return;
				}
				statusElement.status('Menambahkan permintaan baru...');
				rppPage.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ Meminta ' + params.typename + (params.typename === 'pending changes' ? ' di [[:' : ' dari [[:') +
					Morebits.pageNameNorm + ']].');
				rppPage.setChangeTags(Twinkle.changeTags);
				rppPage.setPageText(text);
				rppPage.setCreateOption('recreate');
				rppPage.save(() => {
					// Watch the page being requested
					const watchPref = Twinkle.getPref('watchRequestedPages');
					// action=watch has no way to rely on user preferences (T262912), so we do it manually.
					// The watchdefault pref appears to reliably return '1' (string),
					// but that's not consistent among prefs so might as well be "correct"
					const watch = watchPref !== 'no' && (watchPref !== 'default' || !!parseInt(mw.user.options.get('watchdefault'), 10));
					if (watch) {
						const watch_query = {
							action: 'watch',
							titles: mw.config.get('wgPageName'),
							token: mw.user.tokens.get('watchToken')
						};
						// Only add the expiry if page is unwatched or already temporarily watched
						if (Twinkle.protect.watched !== true && watchPref !== 'default' && watchPref !== 'yes') {
							watch_query.expiry = watchPref;
						}
						new Morebits.wiki.Api('Menambahkan halaman diminta ke daftar pantauan', watch_query).post();
					}
				});
			} else {
				const originalTextLength2 = text2.length;
				text2 += '\n' + newtag;
				if (text2.length === originalTextLength2) {
					const linknode2 = document.createElement('a');
					linknode2.setAttribute('href', mw.util.getUrl('Wikipedia:Twinkle/Memperbaiki RPP'));
					linknode2.appendChild(document.createTextNode('Bagaimana cara memperbaiki RPP'));
					statusElement.error([ 'Tidak dapat menemukan heading terkait di WP:RPP. Untuk memperbaiki masalah ini, tolong lihat ', linknode2, '.' ]);
					return;
				}
				statusElement.status('Menambahkan permintaan baru...');
				rppPage2.setEditSummary('/* ' + Morebits.pageNameNorm + ' */ Meminta ' + params.typename + (params.typename === 'perubahan tertunda' ? ' di [[:' : ' dari [[:') +
					Morebits.pageNameNorm + ']].');
				rppPage2.setChangeTags(Twinkle.changeTags);
				rppPage2.setPageText(text2);
				rppPage2.setCreateOption('recreate');
				rppPage2.save(() => {
					// Watch the page being requested
					const watchPref = Twinkle.getPref('watchRequestedPages');
					// action=watch has no way to rely on user preferences (T262912), so we do it manually.
					// The watchdefault pref appears to reliably return '1' (string),
					// but that's not consistent among prefs so might as well be "correct"
					const watch = watchPref !== 'no' && (watchPref !== 'default' || !!parseInt(mw.user.options.get('watchdefault'), 10));
					if (watch) {
						const watch_query = {
							action: 'watch',
							titles: mw.config.get('wgPageName'),
							token: mw.user.tokens.get('watchToken')
						};
						// Only add the expiry if page is unwatched or already temporarily watched
						if (Twinkle.protect.watched !== true && watchPref !== 'default' && watchPref !== 'yes') {
							watch_query.expiry = watchPref;
						}
						new Morebits.wiki.Api('Menambahkan halaman diminta ke daftar pantauan', watch_query).post();
					}
				});
			}
		});
	}
};

Twinkle.addInitCallback(Twinkle.protect, 'protect');
}());

// </nowiki>
