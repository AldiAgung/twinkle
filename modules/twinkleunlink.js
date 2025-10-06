// <nowiki>

(function() {

/*
 ****************************************
 *** twinkleunlink.js: Unlink module
 ****************************************
 * Mode of invocation:     Tab ("Unlink")
 * Active on:              Non-special pages, except Wikipedia:Sandbox
 */

Twinkle.unlink = function twinkleunlink() {
	if (mw.config.get('wgNamespaceNumber') < 0 || mw.config.get('wgPageName') === 'Wikipedia:Bak pasir' ||
		// Restrict to extended confirmed users (see #428)
		(!Morebits.userIsInGroup('extendedconfirmed') && !Morebits.userIsSysop)) {
		return;
	}
	Twinkle.addPortletLink(Twinkle.unlink.callback, 'Unlink', 'tw-unlink', 'Hapus pranala balik');
};

// the parameter is used when invoking unlink from admin speedy
Twinkle.unlink.callback = function(presetReason) {
	const fileSpace = mw.config.get('wgNamespaceNumber') === 6;

	const Window = new Morebits.SimpleWindow(600, 440);
	Window.setTitle('Menghapus pranala balik' + (fileSpace ? ' dan penggunaan berkas' : ''));
	Window.setScriptName('Twinkle');
	Window.addFooterLink('Prefrensi hapus pranala', 'WP:TW/PREF#unlink');
	Window.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#unlink');
	Window.addFooterLink('Berikan umpan balik', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.unlink.callback.evaluate);

	// prepend some documentation: files are commented out, while any
	// display text is preserved for links (otherwise the link itself is used)
	const linkTextBefore = Morebits.htmlNode('code', '[[' + (fileSpace ? ':' : '') + Morebits.pageNameNorm + '|teks pranala]]');
	const linkTextAfter = Morebits.htmlNode('code', 'teks pranala');
	const linkPlainBefore = Morebits.htmlNode('code', '[[' + Morebits.pageNameNorm + ']]');
	let linkPlainAfter;
	if (fileSpace) {
		linkPlainAfter = Morebits.htmlNode('code', '<!-- [[' + Morebits.pageNameNorm + ']] -->');
	} else {
		linkPlainAfter = Morebits.htmlNode('code', Morebits.pageNameNorm);
	}

	form.append({
		type: 'div',
		style: 'margin-bottom: 0.5em',
		label: [
			'Alat ini membantu Anda menghapus semua pranala balik ke halaman ini' +
				(fileSpace ? ', dan/atau menyembunyikan penggunaan berkas ini dengan markah komentar <!-- --> ' : '') +
				'. Misalnya, ',
			linkTextBefore, ' akan menjadi ', linkTextAfter, ' dan ',
			linkPlainBefore, ' akan menjadi ', linkPlainAfter, '. Alat ini tidak akan menghapus pranala pengalihan atau tautan dengan halaman ini ("selflinks") yang mengarah ke halaman ini. Berhati-hatilah saat menggunakan.'
		]
	});

	form.append({
		type: 'input',
		name: 'reason',
		label: 'Alasan:',
		value: presetReason || '',
		size: 60
	});

	const query = {
		action: 'query',
		list: 'backlinks',
		bltitle: mw.config.get('wgPageName'),
		bllimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
		blnamespace: Twinkle.getPref('unlinkNamespaces'),
		rawcontinue: true,
		format: 'json'
	};
	if (fileSpace) {
		query.list += '|imageusage';
		query.iutitle = query.bltitle;
		query.iulimit = query.bllimit;
		query.iunamespace = query.blnamespace;
	} else {
		query.blfilterredir = 'nonredirects';
	}
	const wikipedia_api = new Morebits.wiki.Api('Mengambil pranala balik', query, Twinkle.unlink.callbacks.display.backlinks);
	wikipedia_api.params = { form: form, Window: Window, image: fileSpace };
	wikipedia_api.post();

	const root = document.createElement('div');
	root.style.padding = '15px'; // just so it doesn't look broken
	Morebits.Status.init(root);
	wikipedia_api.statelem.status('memuat...');
	Window.setContent(root);
	Window.display();
};

Twinkle.unlink.callback.evaluate = function twinkleunlinkCallbackEvaluate(event) {
	const form = event.target;
	const input = Morebits.QuickForm.getInputData(form);

	if (!input.reason) {
		alert('Anda harus memberikan alasan untuk menghapus pranala.');
		return;
	}

	input.backlinks = input.backlinks || [];
	input.imageusage = input.imageusage || [];
	const pages = Morebits.array.uniq(input.backlinks.concat(input.imageusage));
	if (!pages.length) {
		alert('Anda harus memberikan alasan untuk menghapus pranala.');
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	const unlinker = new Morebits.BatchOperation('Menghapus pranala balik ' + (input.backlinks.length ? +
			(input.imageusage.length ? ' dan penggunaan berkas' : '') : 'dan penggunaan berkas'));
	unlinker.setOption('preserveIndividualStatusLines', true);
	unlinker.setPageList(pages);
	const params = { reason: input.reason, unlinker: unlinker };
	unlinker.run((pageName) => {
		const wikipedia_page = new Morebits.wiki.Page(pageName, 'Menghapus di artikel "' + pageName + '"');
		wikipedia_page.setBotEdit(true); // unlink considered a floody operation
		wikipedia_page.setCallbackParameters($.extend({
			doBacklinks: input.backlinks.includes(pageName),
			doImageusage: input.imageusage.includes(pageName)
		}, params));
		wikipedia_page.load(Twinkle.unlink.callbacks.unlinkBacklinks);
	});
};

Twinkle.unlink.callbacks = {
	display: {
		backlinks: function twinkleunlinkCallbackDisplayBacklinks(apiobj) {
			const response = apiobj.getResponse();
			let havecontent = false;
			let list, namespaces, i;

			if (apiobj.params.image) {
				const imageusage = response.query.imageusage.sort(Twinkle.sortByNamespace);
				list = [];
				for (i = 0; i < imageusage.length; ++i) {
					// Label made by Twinkle.generateBatchPageLinks
					list.push({ label: '', value: imageusage[i].title, checked: true });
				}
				if (!list.length) {
					apiobj.params.form.append({ type: 'div', label: 'Tidak ditemukan penggunaan gambar.' });
				} else {
					apiobj.params.form.append({ type: 'header', label: 'Penggunaan berkas' });
					namespaces = [];
					$.each(Twinkle.getPref('unlinkNamespaces'), (k, v) => {
						namespaces.push(v === '0' ? '(Artikel)' : mw.config.get('wgFormattedNamespaces')[v]);
					});
					apiobj.params.form.append({
						type: 'div',
						label: 'Ruangnama terpilih: ' + namespaces.join(', '),
						tooltip: 'Anda dapat mengubah setelan ini di preferensi Twinkle Anda di [[WP:TWPREFS]]'
					});
					if (response['query-continue'] && response['query-continue'].imageusage) {
						apiobj.params.form.append({
							type: 'div',
							label: 'Ditampilkan ' + mw.language.convertNumber(list.length) + ' instansi penggunaan berkas.'
						});
					}
					apiobj.params.form.append({
						type: 'button',
						label: 'Pilih semua',
						event: function(e) {
							$(Morebits.QuickForm.getElements(e.target.form, 'imageusage')).prop('checked', true);
						}
					});
					apiobj.params.form.append({
						type: 'button',
						label: 'Hapus semua pilihan',
						event: function(e) {
							$(Morebits.QuickForm.getElements(e.target.form, 'imageusage')).prop('checked', false);
						}
					});
					apiobj.params.form.append({
						type: 'checkbox',
						name: 'imageusage',
						shiftClickSupport: true,
						list: list
					});
					havecontent = true;
				}
			}

			const backlinks = response.query.backlinks.sort(Twinkle.sortByNamespace);
			if (backlinks.length > 0) {
				list = [];
				for (i = 0; i < backlinks.length; ++i) {
					// Label made by Twinkle.generateBAndaatchPageLinks
					list.push({ label: '', value: backlinks[i].title, checked: true });
				}
				apiobj.params.form.append({ type: 'header', label: 'Backlinks' });
				namespaces = [];
				$.each(Twinkle.getPref('unlinkNamespaces'), (k, v) => {
					namespaces.push(v === '0' ? '(Artikel)' : mw.config.get('wgFormattedNamespaces')[v]);
				});
				apiobj.params.form.append({
					type: 'div',
					label: 'Ruangnama terplih: ' + namespaces.join(', '),
					tooltip: 'Anda dapat mengubah setelan ini di preferensi Twinkle Anda di [[WP:TWPREFS]]'
				});
				if (response['query-continue'] && response['query-continue'].backlinks) {
					apiobj.params.form.append({
						type: 'div',
						label: 'Pranla balik ' + mw.language.convertNumber(list.length) + ' pertama ditampilkan.'
					});
				}
				apiobj.params.form.append({
					type: 'button',
					label: 'Pilih semua',
					event: function(e) {
						$(Morebits.QuickForm.getElements(e.target.form, 'backlinks')).prop('checked', true);
					}
				});
				apiobj.params.form.append({
					type: 'button',
					label: 'Batalkan semua pilihan',
					event: function(e) {
						$(Morebits.QuickForm.getElements(e.target.form, 'backlinks')).prop('checked', false);
					}
				});
				apiobj.params.form.append({
					type: 'checkbox',
					name: 'backlinks',
					shiftClickSupport: true,
					list: list
				});
				havecontent = true;
			} else {
				apiobj.params.form.append({ type: 'div', label: 'Tidak ditemukan pranala balik.' });
			}

			if (havecontent) {
				apiobj.params.form.append({ type: 'submit' });
			}

			const result = apiobj.params.form.render();
			apiobj.params.Window.setContent(result);

			Morebits.QuickForm.getElements(result, 'backlinks').forEach(Twinkle.generateBatchPageLinks);
			Morebits.QuickForm.getElements(result, 'imageusage').forEach(Twinkle.generateBatchPageLinks);

		}
	},
	unlinkBacklinks: function twinkleunlinkCallbackUnlinkBacklinks(pageobj) {
		let oldtext = pageobj.getPageText();
		const params = pageobj.getCallbackParameters();
		const wikiPage = new Morebits.wikitext.Page(oldtext);

		let summaryText = '', warningString = false;
		let text;

		// remove image usages
		if (params.doImageusage) {
			text = wikiPage.commentOutImage('Berkomentar', mw.config.get('wgTitle')).getText();
			// did we actually make any changes?
			if (text === oldtext) {
				warningString = 'penggunaan berkas';
			} else {
				summaryText = 'Mengomentari berkas pengguna';
				oldtext = text;
			}
		}

		// remove backlinks
		if (params.doBacklinks) {
			text = wikiPage.removeLink(Morebits.pageNameNorm).getText();
			// did we actually make any changes?
			if (text === oldtext) {
				warningString = warningString ? 'pranala balik atau penggunaan berkas' : 'pranala balik';
			} else {
				summaryText = (summaryText ? summaryText + ' / ' : '') + 'Menghapus tautan untuk';
				oldtext = text;
			}
		}

		if (warningString) {
			// nothing to do!
			pageobj.getStatusElement().error("Tidak ditemukan adanya " + warningString + ' 	di halaman ini.');
			params.unlinker.workerFailure(pageobj);
			return;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary(summaryText + ' "' + Morebits.pageNameNorm + '": ' + params.reason + '.');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setCreateOption('nocreate');
		pageobj.save(params.unlinker.workerSuccess, params.unlinker.workerFailure);
	}
};

Twinkle.addInitCallback(Twinkle.unlink, 'unlink');
}());

// </nowiki>
