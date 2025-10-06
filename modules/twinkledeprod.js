// <nowiki>


(function($) {


/*
****************************************
*** twinkledeprod.js: Batch deletion of expired PRODs (sysops only)
****************************************
* Mode of invocation:     Tab ("Deprod")
* Active on:              Categories whose name contains "proposed_deletion"
*/

Twinkle.deprod = function() {
	if (
		!Morebits.userIsSysop ||
		mw.config.get('wgNamespaceNumber') !== 14 ||
		!(/proposed_deletion/i).test(mw.config.get('wgPageName'))
	) {
		return;
	}
	Twinkle.addPortletLink(Twinkle.deprod.callback, 'Deprod', 'tw-deprod', 'Halaman penghapusan prod ditemukan di kategori ini');
};

const concerns = {};

Twinkle.deprod.callback = function() {
	const Window = new Morebits.simpleWindow(800, 400);
	Window.setTitle('Pembersihan PROD');
	Window.setScriptName('Twinkle');
	Window.addFooterLink('Usulan penghapusan', 'WP:PROD');
	Window.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#deprod');

	const form = new Morebits.quickForm(callback_commit);

	const statusdiv = document.createElement('div');
	statusdiv.style.padding = '15px';
	Window.setContent(statusdiv);
	Morebits.status.init(statusdiv);
	Window.display();

	const query = {
		action: 'query',
		generator: 'categorymembers',
		gcmtitle: mw.config.get('wgPageName'),
		gcmlimit: Twinkle.getPref('batchMax'),
		gcmnamespace: '0|2', // mostly to ignore categories
		prop: 'info|revisions',
		rvprop: 'content',
		inprop: 'protection',
		format: 'json'
	};

	const statelem = new Morebits.status('Mengambil daftar halaman');
	const wikipedia_api = new Morebits.wiki.api('memuat...', query, ((apiobj) => {
		const respon = apiobj.getResponse();
		const pages = (respon.query && respon.query.pages) || [];
		const list = [];
		const re = /\{\{Proposed deletion/;
		pages.sort(Twinkle.sortByNamespace);
		pages.forEach((page) => {
			const metadata = [];

			const content = page.revisions[0].content;
			const res = re.exec(content);
			const title = page.title;
			if (res) {
				const parsed = Morebits.wikitext.parseTemplate(content, res.index);
				concerns[title] = parsed.parameters.concern || '';
				metadata.push(concerns[title]);
			}
			const editProt = page.protection.filter((pr) => pr.type === 'edit' && pr.level === 'sysop').pop();
			if (editProt) {
				metadata.push('fully protected' +
					(editProt.expiry === 'tidak terbatas' ? ' tidak didefinisikan' : ', kadaluwarsa ' + editProt.expiry));
			}
			list.push({
				label: metadata.length ? '(' + metadata.join('; ') + ')' : '',
				value: title,
				checked: concerns[title] !== '',
				style: editProt ? 'color:red' : ''
			});
		});
		apiobj.params.form.append({ type: 'header', label: 'Halaman untuk dihapus' });
		apiobj.params.form.append({
			type: 'button',
			label: 'Pilih semua',
			event: function(e) {
				$(Morebits.quickForm.getElements(e.target.form, 'pages')).prop('checked', true);
			}
		});
		apiobj.params.form.append({
			type: 'button',
			label: 'Batalkan pilihan',
			event: function(e) {
				$(Morebits.quickForm.getElements(e.target.form, 'pages')).prop('checked', false);
			}
		});
		apiobj.params.form.append({
			type: 'checkbox',
			name: 'pages',
			list: list
		});
		apiobj.params.form.append({
			type: 'submit'
		});

		const rendered = apiobj.params.form.render();
		apiobj.params.Window.setContent(rendered);
		Morebits.QuickForm.getElements(rendered, 'pages').forEach(Twinkle.generateBatchPageLinks);
	}), statelem);

	wikipedia_api.params = { form: form, Window: Window };
	wikipedia_api.post();
};

var callback_commit = function(event) {
		const pages = Morebits.quickForm.getInputData(event.target).pages;
		Morebits.status.init(event.target);

		const batchOperation = new Morebits.batchOperation('Menghapus halaman');
		batchOperation.setOption('chunkSize', Twinkle.getPref('batchChunks'));
		batchOperation.setOption('preserveIndividualStatusLines', true);
		batchOperation.setPageList(pages);
		batchOperation.run((pageName) => {
			const params = { page: pageName, reason: concerns[page] };

			let query = {
				action: 'query',
				titles: pageName,
				prop: 'redirects',
				rdlimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
				format: 'json'
			};
			let wikipedia_api = new Morebits.wiki.api('Mengambil pengalihan', query, callback_deleteRedirects);
			wikipedia_api.params = params;
			wikipedia_api.post();

			const judulHalaman = mw.Title.newFromText(pageName);
			if (judulHalaman && judulHalaman.namespace % 2 === 0 && judulHalaman.namespace !== 2) {
				judulHalaman.namespace++; // sekarang judulHalaman adalah judul halaman pembicaraan!
				query = {
					action: 'query',
					titles: judulHalaman.toText(),
					format: 'json'
				};
			let wikipedia_api = new Morebits.wiki.api('Mengecek ' + pageName + ' mempunyai halaman pembicaraan', query, callback_deleteTalk);
			wikipedia_api.params = params;
			wikipedia_api.post();
			}

			var page = new Morebits.wiki.page(pageName, 'Menghapus halaman ' + pageName);
			page.setEditSummary('[[WP:PROD|PROD]] sudah tidak berlaku, alasannya adalah: ' + concerns[pageName] + Twinkle.getPref('deletionSummaryAd'));
			page.setChangeTags(Twinkle.changeTags);
			page.suppressProtectWarning();
			page.deletePage(batchOperation.workerSuccess, batchOperation.workerFailure);
		});
	},
	callback_deleteTalk = function(apiobj) {
		if (apiobj.getResponse().query.pages[0].missing) {
			return;
		}

		const page = new Morebits.wiki.Page('Pembicaraan:' + apiobj.params.page, 'Menghapus halaman pembicaraan dari halaman ' + apiobj.params.page);
		page.setEditSummary('[[WP:KPC#U8|U8]]: [[Bantuan:Halaman Pembicaraan|Halaman pembicaraan]] dari halaman terhapus [[' + apiobj.params.page + ']]');
		page.setChangeTags(Twinkle.changeTags);
		page.deletePage();
	},
	callback_deleteRedirects = function(apiobj) {
		const respon = apiobj.getResponse();
		const redirects = respon.query.pages[0].redirects || [];
		redirects.forEach((rd) => {
			const judul = rd.title;
			const page = new Morebits.wiki.Page(judul, 'Menghapus pengalihan halaman' + judul);
			page.setEditSummary('[[WP:KPC#U8|U8]]: Mengalihkan ke halaman terhapus [[' + apiobj.params.page + ']]');
			page.setChangeTags(Twinkle.changeTags);
			page.deletePage();
		});
	};

Twinkle.addInitCallback(Twinkle.deprod, 'deprod');
}());

// </nowiki>
