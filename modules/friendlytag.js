// <nowiki>

(function() {

/*
 ****************************************
 *** twinkletag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles and drafts; file pages with a corresponding file
 *                         which is local (not on Commons); all redirects
 */

Twinkle.tag = function twinkletag() {
	// redirect tagging (exclude category redirects, which are all soft redirects and so shouldn't be tagged with rcats)
	if (Morebits.isPageRedirect() && mw.config.get('wgNamespaceNumber') !== 14) {
		Twinkle.tag.mode = 'redirect';
		Twinkle.addPortletLink(Twinkle.tag.callback, 'Tag', 'twinkle-tag', 'Tag redirect');
	// file tagging
	} else if (mw.config.get('wgNamespaceNumber') === 6 && !document.getElementById('mw-sharedupload') && document.getElementById('mw-imagepage-section-filehistory')) {
		Twinkle.tag.mode = 'file';
		Twinkle.addPortletLink(Twinkle.tag.callback, 'Tag', 'twinkle-tag', 'Tambah tag pemeliharaan ke berkas');
	// article/draft article tagging
	} else if ([0, 118].includes(mw.config.get('wgNamespaceNumber')) && mw.config.get('wgCurRevisionId')) {
		Twinkle.tag.mode = 'article';
		// Can't remove tags when not viewing current version
		Twinkle.tag.canRemove = (mw.config.get('wgCurRevisionId') === mw.config.get('wgRevisionId')) &&
			// Disabled on latest diff because the diff slider could be used to slide
			// away from the latest diff without causing the script to reload
			!mw.config.get('wgDiffNewId');
		Twinkle.addPortletLink(Twinkle.tag.callback, 'Tag', 'twinkle-tag', 'Tambah atau hapus tag pemeliharaan artikel');
	}
};

Twinkle.tag.checkedTags = [];

Twinkle.tag.callback = function twinkletagCallback() {
	const Window = new Morebits.SimpleWindow(630, Twinkle.tag.mode === 'article' ? 500 : 400);
	Window.setScriptName('Twinkle');
	// anyone got a good policy/guideline/info page/instructional page link??
	Window.addFooterLink('Preferensi Tag', 'WP:TW/PREF#tag');
	Window.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#tag');
	Window.addFooterLink('Berikan umpan balik', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.tag.callback.evaluate);

	// if page is unreviewed, add a checkbox to the form so that user can pick whether or not to review it
	const isPatroller = mw.config.get('wgUserGroups').some((r) => ['patroller', 'sysop'].includes(r));
	if (isPatroller) {
		new mw.Api().get({
			action: 'pagetriagelist',
			format: 'json',
			page_id: mw.config.get('wgArticleId')
		}).then((response) => {
			// Figure out whether the article is marked as reviewed in PageTriage.
			// Recent articles will have a patrol_status that we can read.
			// For articles that have been out of the new pages feed for awhile, pages[0] will be undefined.
			const isReviewed = response.pagetriagelist.pages[0] ?
				response.pagetriagelist.pages[0].patrol_status > 0 :
				true;

			// if article is not marked as reviewed, show the "mark as reviewed" check box
			if (!isReviewed) {
				// Quickform is probably already rendered. Instead of using form.append(), we need to make an element and then append it using JQuery.
				const checkbox = new Morebits.QuickForm.Element({
					type: 'checkbox',
					list: [
						{
							label: 'Tandai halaman terpatroli',
							value: 'patrol',
							name: 'patrol',
							checked: Twinkle.getPref('markTaggedPagesAsPatrolled')
						}
					]
				});
				const html = checkbox.render();
				$('.quickform').prepend(html);
			}
		});
	}

	form.append({
		type: 'input',
		label: 'Daftar saring tag:',
		name: 'quickfilter',
		size: '30',
		event: function twinkletagquickfilter() {
			// flush the DOM of all existing underline spans
			$allCheckboxDivs.find('.search-hit').each((i, e) => {
				const labelElement = e.parentElement;
				// This would convert <label>Hello <span class=search-hit>wo</span>rld</label>
				// to <label>Hello world</label>
				labelElement.innerHTML = labelElement.textContent;
			});

			if (this.value) {
				$allCheckboxDivs.hide();
				$allHeaders.hide();
				const searchString = this.value;
				const searchRegex = new RegExp(mw.util.escapeRegExp(searchString), 'i');

				$allCheckboxDivs.find('label').each(function () {
					const labelText = this.textContent;
					const searchHit = searchRegex.exec(labelText);
					if (searchHit) {
						const range = document.createRange();
						const textnode = this.childNodes[0];
						range.selectNodeContents(textnode);
						range.setStart(textnode, searchHit.index);
						range.setEnd(textnode, searchHit.index + searchString.length);
						const underlineSpan = $('<span>').addClass('search-hit').css('text-decoration', 'underline')[0];
						range.surroundContents(underlineSpan);
						this.parentElement.style.display = 'block'; // show
					}
				});
			} else {
				$allCheckboxDivs.show();
				$allHeaders.show();
			}
		}
	});

	switch (Twinkle.tag.mode) {
		case 'article':
			Window.setTitle('Tandai pemeliharaan artikel');

			// Build sorting and lookup object flatObject, which is always
			// needed but also used to generate the alphabetical list
			Twinkle.tag.article.flatObject = {};
			Object.values(Twinkle.tag.article.tagList).forEach((group) => {
				Object.values(group).forEach((subgroup) => {
					if (Array.isArray(subgroup)) {
						subgroup.forEach((item) => {
							Twinkle.tag.article.flatObject[item.tag] = item;
						});
					} else {
						Twinkle.tag.article.flatObject[subgroup.tag] = subgroup;
					}
				});
			});

			form.append({
				type: 'select',
				name: 'sortorder',
				label: 'Lihat daftar:',
				tooltip: 'Anda dapat mengganti tampilan urutan default dalam preferensi Twinkle anda (WP:TWPREFS).',
				event: Twinkle.tag.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: 'Berdasarkan kategori', selected: Twinkle.getPref('tagArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: 'Dalam urutan alfabet', selected: Twinkle.getPref('tagArticleSortOrder') === 'alpha' }
				]
			});

			if (!Twinkle.tag.canRemove) {
				const divElement = document.createElement('div');
				divElement.innerHTML = 'Untuk penghapusan tag yang sudah ada, harap buka menu dari revisi terkini artikel';
				form.append({
					type: 'div',
					name: 'untagnotice',
					label: divElement
				});
			}

			form.append({
				type: 'div',
				id: 'tagWorkArea',
				className: 'morebits-scrollbox',
				style: 'max-height: 28em'
			});

			form.append({
				type: 'checkbox',
				list: [
					{
						label: 'Masukan kedalam {{multiple issues}} jika memungkinkan',
						value: 'group',
						name: 'group',
						tooltip: 'Jika menerpakan dua atau lebih templat disertai {{multiple issues}} dan jika kotak ini dicentang, semua templat pendukung akan di grupkan di dalam templat {{multiple issues}}.',
						checked: Twinkle.getPref('groupByDefault')
					}
				]
			});

			form.append({
				type: 'input',
				label: 'Alasan',
				name: 'reason',
				tooltip: 'Alasan opsional yang ingin ditambahkan di ringkasan suntingan. Direkomendasikan saat menghilangkan tag.',
				size: '60'
			});

			break;

		case 'file':
			Window.setTitle('Menandai pemeliharaan berkas');

			$.each(Twinkle.tag.fileList, (groupName, group) => {
				form.append({ type: 'header', label: groupName });
				form.append({ type: 'checkbox', name: 'tags', list: group });
			});

			if (Twinkle.getPref('customFileTagList').length) {
				form.append({ type: 'header', label: 'Tag khusus' });
				form.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customFileTagList') });
			}
			break;

		case 'redirect':
			Window.setTitle('Mengalihkan penandaan');

			// If a tag has a restriction for this namespace or title, return true, so that we know not to display it in the list of check boxes.
			var isRestricted = function(item) {
				if (typeof item.restriction === 'undefined') {
					return false;
				}
				const namespace = mw.config.get('wgNamespaceNumber');
				switch (item.restriction) {
					case 'insideMainspaceOnly':
						if (namespace !== 0) {
							return true;
						}
						break;
					case 'outsideUserspaceOnly':
						if (namespace === 2 || namespace === 3) {
							return true;
						}
						break;
					case 'insideTalkNamespaceOnly':
						if (namespace % 2 !== 1 || namespace < 0) {
							return true;
						}
						break;
					case 'disambiguationPagesOnly':
						if (!mw.config.get('wgPageName').endsWith('_(disambiguasi)')) {
							return true;
						}
						break;
					default:
						alert('Twinkle.tag: pembatasan tidak diketahui ' + item.restriction);
						break;
				}
				return false;
			};

			// Generate the HTML form with the list of redirect tags that the user can choose to apply.
			var i = 1;
			$.each(Twinkle.tag.redirectList, (groupName, group) => {
				form.append({ type: 'header', id: 'tagHeader' + i, label: groupName });
				const subdiv = form.append({ type: 'div', id: 'tagSubdiv' + i++ });
				$.each(group, (subgroupName, subgroup) => {
					subdiv.append({ type: 'div', label: [ Morebits.htmlNode('b', subgroupName) ] });
					subdiv.append({
						type: 'checkbox',
						name: 'tags',
						list: subgroup
							.filter((item) => !isRestricted(item))
							.map((item) => ({ value: item.tag, label: '{{' + item.tag + '}}: ' + item.description, subgroup: item.subgroup }))
					});
				});
			});

			if (Twinkle.getPref('customRedirectTagList').length) {
				form.append({ type: 'header', label: 'Tag khusus' });
				form.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customRedirectTagList') });
			}
			break;

		default:
			alert('Twinkle.tag: mode tidak diketahui ' + Twinkle.tag.mode);
			break;
	}

	form.append({ type: 'submit', className: 'tw-tag-submit' });

	const result = form.render();
	Window.setContent(result);
	Window.display();

	// for quick filter:
	$allCheckboxDivs = $(result).find('[name$=tags]').parent();
	$allHeaders = $(result).find('h5, .quickformDescription');
	result.quickfilter.focus(); // place cursor in the quick filter field as soon as window is opened
	result.quickfilter.autocomplete = 'off'; // disable browser suggestions
	result.quickfilter.addEventListener('keypress', (e) => {
		if (e.keyCode === 13) { // prevent enter key from accidentally submitting the form
			e.preventDefault();
			return false;
		}
	});

	if (Twinkle.tag.mode === 'article') {

		Twinkle.tag.alreadyPresentTags = [];

		if (Twinkle.tag.canRemove) {
			// Look for existing maintenance tags in the lead section and put them in array

			// All tags are HTML table elements that are direct children of .mw-parser-output,
			// except when they are within {{multiple issues}}
			$('.mw-parser-output').children().each((i, e) => {

				// break out on encountering the first heading, which means we are no
				// longer in the lead section
				if (e.classList.contains('mw-heading')) {
					return false;
				}

				// The ability to remove tags depends on the template's {{ambox}} |name=
				// parameter bearing the template's correct name (preferably) or a name that at
				// least redirects to the actual name

				// All tags have their first class name as "box-" + template name
				if (e.className.indexOf('box-') === 0) {
					if (e.classList[0] === 'box-Multiple_issues') {
						$(e).find('.ambox').each((idx, e) => {
							if (e.classList[0].indexOf('box-') === 0) {
								const tag = e.classList[0].slice('box-'.length).replace(/_/g, ' ');
								Twinkle.tag.alreadyPresentTags.push(tag);
							}
						});
						return true; // continue
					}

					const tag = e.classList[0].slice('box-'.length).replace(/_/g, ' ');
					Twinkle.tag.alreadyPresentTags.push(tag);
				}
			});

			// {{Uncategorized}} and {{Improve categories}} are usually placed at the end
			if ($('.box-Uncategorized').length) {
				Twinkle.tag.alreadyPresentTags.push('Tidak dikatagorikan');
			}
			if ($('.box-Improve_categories').length) {
				Twinkle.tag.alreadyPresentTags.push('Tingkatkan kategori');
			}

		}

		// Add status text node after Submit button
		const statusNode = document.createElement('small');
		statusNode.id = 'tw-tag-status';
		Twinkle.tag.status = {
			// initial state; defined like this because these need to be available for reference
			// in the click event handler
			numAdded: 0,
			numRemoved: 0
		};
		$('button.tw-tag-submit').after(statusNode);

		// fake a change event on the sort dropdown, to initialize the tag list
		const evt = document.createEvent('Event');
		evt.initEvent('change', true, true);
		result.sortorder.dispatchEvent(evt);
	} else {
		// Redirects and files: Add a link to each template's description page
		Morebits.QuickForm.getElements(result, 'tags').forEach(generateLinks);
	}
};

// $allCheckboxDivs and $allHeaders are defined globally, rather than in the
// quickfilter event function, to avoid having to recompute them on every keydown
let $allCheckboxDivs, $allHeaders;

Twinkle.tag.updateSortOrder = function(e) {
	const form = e.target.form;
	const sortorder = e.target.value;
	Twinkle.tag.checkedTags = form.getChecked('tags');

	const container = new Morebits.QuickForm.Element({ type: 'fragment' });

	// function to generate a checkbox, with appropriate subgroup if needed
	const makeCheckbox = function (item) {
		const tag = item.tag, description = item.description;
		const checkbox = { value: tag, label: '{{' + tag + '}}: ' + description };
		if (Twinkle.tag.checkedTags.includes(tag)) {
			checkbox.checked = true;
		}
		checkbox.subgroup = item.subgroup;
		return checkbox;
	};

	const makeCheckboxesForAlreadyPresentTags = function() {
		container.append({ type: 'header', id: 'tagHeader0', label: 'Tag sudah ada' });
		const subdiv = container.append({ type: 'div', id: 'tagSubdiv0' });
		const checkboxes = [];
		const unCheckedTags = e.target.form.getUnchecked('existingTags');
		Twinkle.tag.alreadyPresentTags.forEach((tag) => {
			const checkbox =
				{
					value: tag,
					label: '{{' + tag + '}}' + (Twinkle.tag.article.flatObject[tag] ? ': ' + Twinkle.tag.article.flatObject[tag].description : ''),
					checked: !unCheckedTags.includes(tag),
					style: 'font-style: italic'
				};

			checkboxes.push(checkbox);
		});
		subdiv.append({
			type: 'checkbox',
			name: 'existingTags',
			list: checkboxes
		});
	};

	if (sortorder === 'cat') { // categorical sort order
		// function to iterate through the tags and create a checkbox for each one
		const doCategoryCheckboxes = function(subdiv, subgroup) {
			const checkboxes = [];
			$.each(subgroup, (k, item) => {
				if (!Twinkle.tag.alreadyPresentTags.includes(item.tag)) {
					checkboxes.push(makeCheckbox(item));
				}
			});
			subdiv.append({
				type: 'checkbox',
				name: 'tags',
				list: checkboxes
			});
		};

		if (Twinkle.tag.alreadyPresentTags.length > 0) {
			makeCheckboxesForAlreadyPresentTags();
		}
		let i = 1;
		// go through each category and sub-category and append lists of checkboxes
		$.each(Twinkle.tag.article.tagList, (groupName, group) => {
			container.append({ type: 'header', id: 'tagHeader' + i, label: groupName });
			const subdiv = container.append({ type: 'div', id: 'tagSubdiv' + i++ });
			if (Array.isArray(group)) {
				doCategoryCheckboxes(subdiv, group);
			} else {
				$.each(group, (subgroupName, subgroup) => {
					subdiv.append({ type: 'div', label: [ Morebits.htmlNode('b', subgroupName) ] });
					doCategoryCheckboxes(subdiv, subgroup);
				});
			}
		});
	} else { // alphabetical sort order
		if (Twinkle.tag.alreadyPresentTags.length > 0) {
			makeCheckboxesForAlreadyPresentTags();
			container.append({ type: 'header', id: 'tagHeader1', label: 'Tag yang tersedia' });
		}

		// Avoid repeatedly resorting
		Twinkle.tag.article.alphabeticalList = Twinkle.tag.article.alphabeticalList || Object.keys(Twinkle.tag.article.flatObject).sort();
		const checkboxes = [];
		Twinkle.tag.article.alphabeticalList.forEach((tag) => {
			if (!Twinkle.tag.alreadyPresentTags.includes(tag)) {
				checkboxes.push(makeCheckbox(Twinkle.tag.article.flatObject[tag]));
			}
		});
		container.append({
			type: 'checkbox',
			name: 'tags',
			list: checkboxes
		});
	}

	// append any custom tags
	if (Twinkle.getPref('customTagList').length) {
		container.append({ type: 'header', label: 'Tag kustom' });
		container.append({ type: 'checkbox', name: 'tags',
			list: Twinkle.getPref('customTagList').map((el) => {
				el.checked = Twinkle.tag.checkedTags.includes(el.value);
				return el;
			})
		});
	}

	const $workarea = $(form).find('#tagWorkArea');
	const rendered = container.render();
	$workarea.empty().append(rendered);

	// for quick filter:
	$allCheckboxDivs = $workarea.find('[name=tags], [name=existingTags]').parent();
	$allHeaders = $workarea.find('h5, .quickformDescription');
	form.quickfilter.value = ''; // clear search, because the search results are not preserved over mode change
	form.quickfilter.focus();

	// style adjustments
	$workarea.find('h5').css({ 'font-size': '110%' });
	$workarea.find('h5:not(:first-child)').css({ 'margin-top': '1em' });
	$workarea.find('div').filter(':has(span.quickformDescription)').css({ 'margin-top': '0.4em' });

	Morebits.QuickForm.getElements(form, 'existingTags').forEach(generateLinks);
	Morebits.QuickForm.getElements(form, 'tags').forEach(generateLinks);

	// tally tags added/removed, update statusNode text
	const statusNode = document.getElementById('tw-tag-status');
	$('[name=tags], [name=existingTags]').on('click', function() {
		if (this.name === 'tags') {
			Twinkle.tag.status.numAdded += this.checked ? 1 : -1;
		} else if (this.name === 'existingTags') {
			Twinkle.tag.status.numRemoved += this.checked ? -1 : 1;
		}

		const firstPart = 'Menambanhkan ' + Twinkle.tag.status.numAdded + ' tag' + (Twinkle.tag.status.numAdded);
		const secondPart = 'Menghilangkan ' + Twinkle.tag.status.numRemoved + ' tag' + (Twinkle.tag.status.numRemoved);
		statusNode.textContent =
			(Twinkle.tag.status.numAdded ? '  ' + firstPart : '') +
			(Twinkle.tag.status.numRemoved ? (Twinkle.tag.status.numAdded ? '; ' : '  ') + secondPart : '');
	});
};

/**
 * Adds a link to each template's description page
 *
 * @param {Morebits.QuickForm.Element} checkbox  associated with the template
 */
var generateLinks = function(checkbox) {
	const link = Morebits.htmlNode('a', '>');
	link.setAttribute('class', 'tag-template-link');
	const tagname = checkbox.values;
	link.setAttribute('href', mw.util.getUrl(
		(!tagname.includes(':') ? 'Templat:' : '') +
		(!tagname.includes('|') ? tagname : tagname.slice(0, tagname.indexOf('|')))
	));
	link.setAttribute('target', '_blank');
	$(checkbox).parent().append(['\u00A0', link]);
};

// Tags for ARTICLES start here
Twinkle.tag.article = {};

// Shared across {{Rough translation}} and {{Not English}}
const translationSubgroups = [
	{
		name: 'translationLanguage',
		parameter: '1',
		type: 'input',
		label: 'Bahasa artikel (jika diketahui):',
		tooltip: 'Consider looking at [[WP:LRC]] for help. If listing the article at PNT, please try to avoid leaving this box blank, unless you are completely unsure.'
	}
].concat(mw.config.get('wgNamespaceNumber') === 0 ? [
	{
		type: 'checkbox',
		list: [ {
			name: 'translationPostAtPNT',
			label: 'Masukan artikel ini kedalam Wikipedia:Halaman untuk diterjemahkan ke Bahasa Indonesia (PNT)',
			checked: true
		} ]
	},
	{
		name: 'translationComments',
		type: 'textarea',
		label: 'Komentar tamabahan untuk dimasukkan ke PNT',
		tooltip: 'Opsional, dan hanya akan relevan jika "Daftar artikel ..." diatas diperiksa.'
	}
] : []);

// Subgroups for {{merge}}, {{merge-to}} and {{merge-from}}
const getMergeSubgroups = function(tag) {
	let otherTagName = 'Merge';
	switch (tag) {
		case 'Merge from':
			otherTagName = 'Merge to';
			break;
		case 'Merge to':
			otherTagName = 'Merge from';
			break;
		// no default
	}
	return [
		{
			name: 'mergeTarget',
			type: 'input',
			label: 'Artikel lainnya:',
			tooltip: 'Jika memasukan beberapa artikel, pisahkan dengan karakter garis: Artikel satu|Artikel dua',
			required: true
		},
		{
			type: 'checkbox',
			list: [
				{
					name: 'mergeTagOther',
					label: 'Tandai artikel lainnya dengan tag {{' + otherTagName + '}}',
					checked: true,
					tooltip: 'Hanya tersedia jika memasukan nama artikel.'
				}
			]
		}
	].concat(mw.config.get('wgNamespaceNumber') === 0 ? {
		name: 'mergeReason',
		type: 'textarea',
		label: 'Kriteria untuk digabungkan (Akan dimasukkan ke' + 'halaman pembicaraan' + (tag === 'Merge to' ? 'artikel lain' : 'artikel ini') + ':',
		tooltip: 'Opsional, tetapi lebih direkomendasikan. Biarkan kosong apabila tidak diinginkan. Hanya tersedia jika nama artikel dimasukkan.'
	} : []);
};

// Tags arranged by category; will be used to generate the alphabetical list,
// but tags should be in alphabetical order within the categories
// excludeMI: true indicate a tag that *does not* work inside {{multiple issues}}
// Add new categories with discretion - the list is long enough as is!
Twinkle.tag.article.tagList = {
	'Tag rapikan dan pemeliharaan': {
		'Perapian secara umum': [
			{
				tag: 'Cleanup', description: 'membutuhkan perapian',
				subgroup: {
					name: 'cleanup',
					parameter: 'alasan',
					type: 'input',
					label: 'Alasan spesifik mengapa memerlukan perapian:',
					tooltip: 'Dibutuhkan.',
					size: 35,
					required: true
				}
			}, // has a subgroup with text input
			{
				tag: 'Cleanup rewrite',
				description: "dibtuhkan penulisan ulang seluruhnya untuk memenuhi standar kualitas Wikipedia"
			},
			{
				tag: 'Copy edit',
				description: 'membutuhkan perbaikan salin sunting untuk gaya dan nada penulisan',
				subgroup: {
					name: 'copyEdit',
					parameter: 'for',
					type: 'input',
					label: '"Artikel ini membutuhkan salin sunting untuk..."',
					tooltip: 'mis. "pengejaan konsisten". Opsional.',
					size: 35
				}
			} // has a subgroup with text input
		],
		'Potensi konten tidak diinginkan': [
			{
				tag: 'Close paraphrasing',
				description: 'mengandung parafrase tertutup dari sumber berhak cipta yang tidak bebas',
				subgroup: {
					name: 'closeParaphrasing',
					parameter: 'source',
					type: 'input',
					label: 'Source:',
					tooltip: 'Sumber yang telah diparafrasekan dengan tertutup'
				}
			},
			{
				tag: 'Copypaste',
				description: 'terlihat seperti disalin dan ditempel dari tempat lain',
				excludeMI: true,
				subgroup: {
					name: 'copypaste',
					parameter: 'url',
					type: 'input',
					label: 'URL sumber:',
					tooltip: 'Jika diketahui.',
					size: 50
				}
			}, // has a subgroup with text input
			{ tag: 'AI-generated', description: 'konten terlihat seperti dibuat dengan model bahasa luas' },
			{ tag: 'External links', description: 'pranala luar tidak memenuhi pedoman atau kebijakan' },
			{ tag: 'Non-free', description: 'berisi penggunaan yang berlebih atau tidak sesuai dari materi hak cipta' }
		],
		'Struktur, pemformatan, dan bagian pembuka': [
			{ tag: 'Cleanup reorganize', description: "membutuhkan perapian untuk memenuhi pedoman tata letak Wikipedia" },
			{ tag: 'Lead missing', description: 'tidak ada bagian pemnbuka' },
			{ tag: 'Lead rewrite', description: 'bagian pembuka harus ditulis ulang agar memenuhi pedoman' },
			{ tag: 'Lead too long', description: 'panjang bagian pembuka terlalu panjang untuk ukuran artikel' },
			{ tag: 'Lead too short', description: 'bagian pembuka terlalu pendek dan butuh di perpanjang untuk merangkum poin penting' },
			{ tag: 'Sections', description: 'butuh dipisah menjadi bagian per topik' },
			{ tag: 'Too many sections', description: 'terlalu banyak judul bagian yang membagi konten, harus diringkas' },
			{ tag: 'Very long', description: 'terlalu panjang untuk dibaca dan di navigasi dengan baik' }
		],
		'Perapian terkait fiksi': [
			{ tag: 'All plot', description: 'hampir semuanya ringkasan alur cerita' },
			{ tag: 'Fiction', description: 'gagal membedakan antara fakta dan fiksi' },
			{ tag: 'In-universe', description: 'subjek merupakan fiksi dan perlu ditulis ulang untuk menyediakan perspektif non-fiksi' },
			{ tag: 'Long plot', description: 'ringkasan alur cerita terlalu panjang atau terlalu detail' },
			{ tag: 'More plot', description: 'ringkasan alur cerita terlalu pendek' },
			{ tag: 'No plot', description: 'butuh ringkasan alur cerita' }
		]
	},
	'Masalah konten umum': {
		'Kepentingan dan notabilitas': [
			{ tag: 'Notability', description: 'subyek mungkin tidak memenuhi pedoman notabilitas umum',
				subgroup: {
					name: 'notability',
					parameter: '1',
					type: 'select',
					list: [
						{ label: '{{notability}}: subjek artikel mungkin tidak memenuhi kelayakan secara umum', value: 'none' },
						{ label: '{{notability|Academics}}: pedoman kelayakan untuk akademik', value: 'Academics' },
						{ label: '{{notability|Astro}}: pedoman kelayakan untuk benda astronomi', value: 'Astro' },
						{ label: '{{notability|Biographies}}: pedoman kelayakan untuk biografi', value: 'Biographies' },
						{ label: '{{notability|Books}}: pedoman kelayakan untuk buku', value: 'Books' },
						{ label: '{{notability|Companies}}: pedoman kelayakan untuk perusahaan dan organisasi', value: 'Companies' },
						{ label: '{{notability|Events}}: pedoman kelayakan untuk acara/perhelatan', value: 'Events' },
						{ label: '{{notability|Films}}: pedoman kelayakan untuk film', value: 'Films' },
						{ label: '{{notability|Geographic}}: pedoman kelayakan untuk fitur geografi', value: 'Geographic' },
						{ label: '{{notability|Lists}}: pedoman kelayakan untuk halaman daftar', value: 'Lists' },
						{ label: '{{notability|Music}}: pedoman kelayakan untuk musik', value: 'Music' },
						{ label: '{{notability|Neologisms}}: pedoman kelayakan untuk neologisme', value: 'Neologisms' },
						{ label: '{{notability|Numbers}}: pedoman kelayakan untuk angka', value: 'Numbers' },
						{ label: '{{notability|Products}}: pedoman kelayakan untuk produk dan layanan', value: 'Products' },
						{ label: '{{notability|Sports}}: pedoman kelayakan untuk olahraga', value: 'Sports' },
						{ label: '{{notability|Television}}: pedoman kelayakan untuk acara televisi', value: 'Television' },
						{ label: '{{notability|Web}}: pedoman kelayakan untuk isi situs web', value: 'Web' }
					]
				}
			}
		],
		'Gaya penulisan': [
			{ tag: 'Cleanup press release', description: 'artikel terlihat seperti rilis pers atau artikel berita',
				subgroup: {
					type: 'hidden',
					name: 'cleanupPR1',
					parameter: '1',
					value: 'article'
				}
			},
			{ tag: 'Cleanup tense', description: 'artikel ditulis dalam bentuk kala yang salah.' },
			{ tag: 'Essay-like', description: 'ditulis seperti pandangan penulis, esai pribadi, atau esai argumen' },
			{ tag: 'Fanpov', description: "ditulis dari pandangan seorang penggemar" },
			{ tag: 'Inappropriate person', description: 'menggunakan pandangan orang pertama dan kedua secara tidak benar' },
			{ tag: 'How-to', description: 'ditulis seperti buku manual atau panduan' },
			{ tag: 'Over-quotation', description: 'Terlalu banyak kutipan panjang untuk entri ensiklopedis' },
			{ tag: 'Promotional', description: 'Mengandung konten promosi atau ditulis seperti iklan' },
			{ tag: 'Prose', description: 'written in a list format but may read better as prose' },
			{ tag: 'Resume-like', description: 'ditulis seperti resume' },
			{ tag: 'Technical', description: 'terlalu teknis untuk dibaca pembaca' },
			{ tag: 'Tone', description: 'penulisan gaya dan nada tidak memenuhi nada ensklopedis yang digunakan Wikipedia' }
		],
		'Sense (or lack thereof)': [
			{ tag: 'Confusing', description: 'membingungkan atau tidak jelas' },
			{ tag: 'Unfocused', description: 'kekuarangan fokus atau lebih dari satu topik' }
		],
		'Informasi dan detail': [
			{ tag: 'Context', description: 'konten tidak cukup bagi mereka yang tidak familiar dengan subyek' },
			{ tag: 'Excessive examples', description: 'may contain indiscriminate, excessive, or irrelevant examples' },
			{ tag: 'Expert needed', description: 'butuh perhatian dari ahli pada subyek',
				subgroup: [
					{
						name: 'expertNeeded',
						parameter: '1',
						type: 'input',
						label: 'Nama dari WikiProject relevan:',
						tooltip: 'Optionally, enter the name of a WikiProject which might be able to help recruit an expert. Don\'t include the "WikiProject" prefix.'
					},
					{
						name: 'expertNeededReason',
						parameter: 'reason',
						type: 'input',
						label: 'Alasan:',
						tooltip: 'Penjelasan pendek mengenai permasalahan. Alasan atau pranala Pembicaraan dibutuhkan.'
					},
					{
						name: 'expertNeededTalk',
						parameter: 'talk',
						type: 'input',
						label: 'Diskusi pembicaraan:',
						tooltip: 'Nama bagian halaman pembicaraan artikel ini tempat isu tersebut dibahas. Jangan berikan tautan, cukup nama bagiannya. Tautan Alasan atau tautan Pembicaraan wajib diisi.'
					}
				]
			},
			{ tag: 'Overly detailed', description: 'jumlah detail rumit yang berlebihan' },
			{ tag: 'Undue weight', description: 'lends undue weight to certain ideas, incidents, or controversies' }
		],
		Timeliness: [
			{ tag: 'Current', description: 'documents a current event', excludeMI: true }, // Works but not intended for use in MI
			{ tag: 'Current related', description: 'mendokumentasikan topik yang dipengaruhi oleh peristiwa terkini', excludeMI: true }, // Works but not intended for use in MI
			{ tag: 'Update', description: 'membutuhkan informasi tambahan terbaru',
				subgroup: [
					{
						name: 'updatePart',
						parameter: 'part',
						type: 'input',
						label: 'Bagian dari artikel:',
						tooltip: 'Bagian yang perlu diperbarui',
						size: '45'
					},
					{
						name: 'updateReason',
						parameter: 'reason',
						type: 'input',
						label: 'Reason:',
						tooltip: 'Penjelasan mengapa artikel sudah kadaluwarsa',
						size: '55'
					}
				]
			}
		],
		'Netralitas, bias, dan akurasi faktual': [
			{ tag: 'Autobiography', description: 'autobiografi tidak ditulis dengan netral' },
			{ tag: 'COI', description: 'pembuat atau kebanyakan kontributor memilki konflik kepentingan', subgroup: mw.config.get('wgNamespaceNumber') === 0 ? {
				name: 'coiReason',
				type: 'textarea',
				label: 'Penjelasan untuk tag COI (akan di tempatkan di pembicaraan halaman):',
				tooltip: 'Opsional, tapi sangat direkomendasikan. Biarkan kosong bila tidak perlu.'
			} : [] },
			{ tag: 'Disputed', description: 'akurasi faktual yang dipertanyakan' },
			{ tag: 'Fringe theories', description: 'menyajikan teori pinggiran sebagai pandangan media utama' },
			{ tag: 'Globalize', description: 'tidak menggamabarkan pandangan seluruh dunia terhadap subyek',
				subgroup: [
					{
						type: 'hidden',
						name: 'globalize1',
						parameter: '1',
						value: 'article'
					}, {
						name: 'globalizeRegion',
						parameter: '2',
						type: 'input',
						label: 'Telalu disebutkan negara atau wilayah'
					}
				]
			},
			{ tag: 'Hoax', description: 'sebagian atau keseluruhan merupakan hoaks' },
			{ tag: 'Paid contributions', description: 'mengandung kontributor bayaran, dan membutuhkan perapian' },
			{ tag: 'Peacock', description: 'mengandung kalimat yang mempromosikan subyek dengan pandangan subjektif tanpa menambahkan informasi' },
			{ tag: 'POV', description: 'tidak memakai pandang netral' },
			{ tag: 'Recentism', description: 'slanted towards recent events' },
			{ tag: 'Too few opinions', description: 'tidak memasukan semua pandangan signifikan' },
			{ tag: 'Undisclosed paid', description: 'may have been created or edited in return for undisclosed payments' },
			{ tag: 'Weasel', description: 'neutrality or verifiability is compromised by the use of weasel words' }
		],
		'Pemeriksaan sumber': [
			{ tag: 'BLP no footnotes', description: 'BLP that lacks inline citations'},
			{ tag: 'BLP one source', description: 'BLP that relies largely or entirely on a single source' },
			{ tag: 'BLP sources', description: 'BLP that needs additional references or sources for verification' },
			{ tag: 'BLP unreferenced', description: 'BLP does not cite any sources at all (use BLP PROD instead for new articles)' },
			{ tag: 'More citations needed', description: 'butuh referensi tambahan atau sumber untuk verifikasi' },
			{ tag: 'No significant coverage', description: 'tidak mengutip sumber apapun yang berisi cakupan luas' },
			{ tag: 'No significant coverage (sports)', description: 'sports biography that does not cite any sources containing significant coverage' },
			{ tag: 'One source', description: 'terlalu mengandalkan pada satu sumber' },
			{ tag: 'Original research', description: 'mengandung riset asli' },
			{ tag: 'Primary sources', description: 'terlalu banyak sumber primer, dan memerlukan sumber sekunder' },
			{ tag: 'Self-published', description: 'mengandung referensi publikasi mandiri berlebihan atau tidak sesuai' },
			{ tag: 'Sources exist', description: 'topik terkenal, sumber yang tersedia dapat ditambahkan ke artikel' },
			{ tag: 'Third-party', description: 'terlalu banyak sumber yang berafiliasi degnan subyek' },
			{ tag: 'Unreferenced', description: 'tidak mengutip sumber sama sekali' },
			{ tag: 'Unreliable sources', description: 'beberapa referensi tidak terverfikasi' },
			{ tag: 'User-generated', description: 'mengandng konten referensi pribadi (publikasi mandiri)'}
		]
	},
	'Masalah konten spesifik': {
		Accessibility: [
			{ tag: 'Cleanup colors', description: 'uses color as only way to convey information' },
			{ tag: 'Overcoloured', description: 'penggunaan warna berlebihan'}
		],
		Language: [
			{ tag: 'Tidak Indonesia', description: 'ditulis dalam bahasa selain Indonesia dan membutuhkan penerjemahan',
				excludeMI: true,
				subgroup: translationSubgroups.slice(0, 1).concat([{
					type: 'checkbox',
					list: [
						{
							name: 'translationNotify',
							label: 'Beritahu pembuat artikel',
							checked: true,
							tooltip: "Menempatkan {{uw-notenglish}} di halaman pembicaraan pengguna."
						}
					]
				}]).concat(translationSubgroups.slice(1))
			},
			{ tag: 'Rough translation', description: 'Terjemahan buruk dari bahasa lain', excludeMI: true,
				subgroup: translationSubgroups
			},
			{ tag: 'Expand language', description: 'harus dikembangkan dengan teks terjemahan dari artikel bahasa asing',
				excludeMI: true,
				subgroup: [{
					type: 'hidden',
					name: 'expandLangTopic',
					parameter: 'topic',
					value: '',
					required: true // force empty topic param in output
				}, {
					name: 'expandLanguageLangCode',
					parameter: 'langcode',
					type: 'input',
					label: 'Kode bahasa:',
					tooltip: 'Kode bahasa dari artikel yang harusnya dikembangkan',
					required: true
				}, {
					name: 'expandLanguageArticle',
					parameter: 'otherarticle',
					type: 'input',
					label: 'Nama artikel:',
					tooltip: 'Nama artikel yang ingin dikembangkan dari, tanpa prefix interwiki'
				}]
			}
		],
		Links: [
			{ tag: 'Dead end', description: 'artikel tidak mempunyai pranla ke artikel lain' },
			{ tag: 'Orphan', description: 'tidak memiliki pranala balik dari artikel lain' },
			{ tag: 'Overlinked', description: 'terlalu banyak tautan duplikat dan/atau tidak terkait ke artikel lain' },
			{ tag: 'Underlinked', description: 'butuh pranala wiki lainnya ke artikel lain' }
		],
		'Teknik referensi': [
			{ tag: 'Citation style', description: 'gaya pengutipan tidak konsisten atau jelas' },
			{ tag: 'Cleanup bare URLs', description: 'uses bare URLs for references, which are prone to link rot' },
			{ tag: 'More footnotes needed', description: 'mempunyai beberapa refrensi, but insufficient inline citations' },
			{ tag: 'No footnotes', description: 'mempunyai referensi, but lacks inline citations' },
			{ tag: 'Parenthetical referencing', description: 'uses parenthetical referencing, which is deprecated on Wikipedia' }
		],
		Categories: [
			{ tag: 'Improve categories', description: 'membutuhkan kategori tambahan atau spesifik', excludeMI: true },
			{ tag: 'Uncategorized', description: 'tidak ada kategori', excludeMI: true }
		]
	},
	Merging: [
		{
			tag: 'History merge',
			description: 'halaman lainnya yang riwayatnya perlu digabung dengan halaman ini',
			excludeMI: true,
			subgroup: [
				{
					name: 'histmergeOriginalPage',
					parameter: 'originalpage',
					type: 'input',
					label: 'Halaman lainnya:',
					tooltip: 'Nama dari halaman yang harus digabung ke halaman ini (wajib).',
					required: true
				},
				{
					name: 'histmergeReason',
					parameter: 'reason',
					type: 'input',
					label: 'Alasan:',
					tooltip: 'Penjelasan singkat alasan penggabungan riwayat dibutuhkan.'
				},
				{
					name: 'histmergeSysopDetails',
					parameter: 'details',
					type: 'input',
					label: 'Detail ekstra:',
					tooltip: 'Untuk kasus sulit, sediakan instruksi ekstra untuk pengurus pengulas.'
				}
			]
		},
		{ tag: 'Merge', description: 'harus digabung ke artikel yang diberikan lainnya', excludeMI: true,
			subgroup: getMergeSubgroups('Merge') },
		{ tag: 'Merge from', description: 'artikel yang diberikan lainnya harus digabung ke halaman ini', excludeMI: true,
			subgroup: getMergeSubgroups('Merge from') },
		{ tag: 'Merge to', description: 'harus digabung ke artikel yang diberikan', excludeMI: true,
			subgroup: getMergeSubgroups('Merge to') }
	],
	Informational: [
		{ tag: 'GOCEinuse', description: 'sedang dilakukan salin suntingan dari Kelompok Penyunting', excludeMI: true },
		{ tag: 'In use', description: 'sedang dilakukan suntingan besar dalam waktu singkat', excludeMI: true },
		{ tag: 'Under construction', description: 'dalam proses pengembangan atau perapian penuh', excludeMI: true }
	]
};

// Tags for REDIRECTS start here
// Not by policy, but the list roughly approximates items with >500
// transclusions from Template:R template index
Twinkle.tag.redirectList = {
	'Grammar, punctuation, and spelling': {
		Abbreviation: [
			{ tag: 'R from acronym', description: 'dialihkan dari akronim (contoh POTUS) ke bentuk panjangnya', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from airport code', description: 'redirect from an airport\'s IATA or ICAO code to that airport\'s article', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from airline code', description: 'redirect from an airline\'s IATA or ICAO code to that airline\'s article', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from initialism', description: 'redirect from an initialism (e.g. AGF) to its expanded form', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from MathSciNet abbreviation', description: 'redirect from MathSciNet publication title abbreviation to the unabbreviated title', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from NLM abbreviation', description: 'redirect from a NLM publication title abbreviation to the unabbreviated title', restriction: 'insideMainspaceOnly' }
		],
		Capitalisation: [
			{ tag: 'R from CamelCase', description: 'redirect from a CamelCase title' },
			{ tag: 'R from other capitalisation', description: 'redirect from a title with another method of capitalisation', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from miscapitalisation', description: 'redirect from a capitalisation error' }
		],
		'Grammar & punctuation': [
			{ tag: 'R from modification', description: 'redirect from a modification of the target\'s title, such as with words rearranged' },
			{ tag: 'R from plural', description: 'redirect from a plural word to the singular equivalent', restriction: 'insideMainspaceOnly' },
			{ tag: 'R to plural', description: 'redirect from a singular noun to its plural form', restriction: 'insideMainspaceOnly' }
		],
		'Parts of speech': [
			{ tag: 'R from verb', description: 'redirect from an English-language verb or verb phrase', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from adjective', description: 'redirect from an adjective (word or phrase that describes a noun)', restriction: 'insideMainspaceOnly' }
		],
		Spelling: [
			{ tag: 'R from alternative spelling', description: 'redirect from a title with a different spelling' },
			{ tag: 'R from alternative transliteration', description: 'redirect from an alternative English transliteration to a more common variation' },
			{ tag: 'R from ASCII-only', description: 'redirect from a title in only basic ASCII to the formal title, with differences that are not diacritical marks or ligatures' },
			{ tag: 'R to ASCII-only', description: 'redirect to a title in only basic ASCII from the formal title, with differences that are not diacritical marks or ligatures' },
			{ tag: 'R from diacritic', description: 'redirect from a page name that has diacritical marks (accents, umlauts, etc.)' },
			{ tag: 'R to diacritic', description: 'redirect to the article title with diacritical marks (accents, umlauts, etc.)' },
			{ tag: 'R from misspelling', description: 'redirect from a misspelling or typographical error' }
		]
	},
	'Alternative names': {
		General: [
			{
				tag: 'R from alternative language',
				description: 'pengalihan dari atau ke judul di bahasa lain',
				subgroup: [
					{
						name: 'altLangFrom',
						type: 'input',
						label: 'dari bahasa (kode dua huruf):',
						tooltip: 'Masukan kode dua huruf bahasa pengalihan dari yang sudah ada; seperti id untuk Indonesia, en untuk Inggris'
					},
					{
						name: 'altLangTo',
						type: 'input',
						label: 'Ke bahasa (kode dua huruf):',
						tooltip: 'Masukan kode dua huruf bahasa tujuan; seperti id untuk Indonesia, en untuk Inggris'
					},
					{
						name: 'altLangInfo',
						type: 'div',
						label: $.parseHTML('<p>Untuk daftar kode bahasa, lihat <a href="/wiki/Wp:Template_messages/Redirect_language_codes">Wikipedia:Template messages/Redirect language codes</a></p>')
					}
				]
			},
			{ tag: 'R from alternative name', description: 'redirect from a title that is another name, a pseudonym, a nickname, or a synonym' },
			{ tag: 'R from ambiguous sort name', description: 'redirect from an ambiguous sort name to a page or list that disambiguates it' },
			{ tag: 'R from former name', description: 'redirect from a former or historic name or a working title', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from incomplete name', description: 'R from incomplete name' },
			{ tag: 'R from incorrect name', description: 'redirect from an erroneus name that is unsuitable as a title' },
			{ tag: 'R from less specific name', description: 'redirect from a less specific title to a more specific, less general one' },
			{ tag: 'R from long name', description: 'redirect from a more complete title' },
			{ tag: 'R from more specific name', description: 'redirect from a more specific title to a less specific, more general one' },
			{ tag: 'R from non-neutral name', description: 'redirect from a title that contains a non-neutral, pejorative, controversial, or offensive word, phrase, or name' },
			{ tag: 'R from short name', description: 'redirect from a title that is a shortened form of a person\'s full name, a book title, or other more complete title' },
			{ tag: 'R from sort name', description: 'redirect from the target\'s sort name, such as beginning with their surname rather than given name', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from synonym', description: 'redirect from a semantic synonym of the target page title' }
		],
		People: [
			{ tag: 'R from birth name', description: 'redirect from a person\'s birth name to a more common name', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from given name', description: 'redirect from a person\'s given name', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from married name', description: 'redirect from a person\'s married name to a more common name', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from name with title', description: 'redirect from a person\'s name preceded or followed by a title to the name with no title or with the title in parentheses', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from person', description: 'redirect from a person or persons to a related article', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from personal name', description: 'redirect from an individual\'s personal name to an article titled with their professional or other better known moniker', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from pseudonym', description: 'redirect from a pseudonym', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from surname', description: 'redirect from a title that is a surname', restriction: 'insideMainspaceOnly' }
		],
		Technical: [
			{ tag: 'R from drug trade name', description: 'redirect from (or to) the trade name of a drug to (or from) the international nonproprietary name (INN)' },
			{ tag: 'R from filename', description: 'redirect from a title that is a filename of the target', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from molecular formula', description: 'redirect from a molecular/chemical formula to its technical or trivial name' },

			{ tag: 'R from gene symbol', description: 'redirect from a Human Genome Organisation (HUGO) symbol for a gene to an article about the gene', restriction: 'insideMainspaceOnly' }
		],
		Organisms: [
			{ tag: 'R to scientific name', description: 'redirect from the common name to the scientific name', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from scientific name', description: 'redirect from the scientific name to the common name', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from alternative scientific name', description: 'redirect from an alternative scientific name to the accepted scientific name', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from scientific abbreviation', description: 'redirect from a scientific abbreviation', restriction: 'insideMainspaceOnly' },
			{ tag: 'R to monotypic taxon', description: 'redirect from the only lower-ranking member of a monotypic taxon to its monotypic taxon', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from monotypic taxon', description: 'redirect from a monotypic taxon to its only lower-ranking member', restriction: 'insideMainspaceOnly' },
			{ tag: 'R taxon with possibilities', description: 'redirect from a title related to a living organism that potentially could be expanded into an article', restriction: 'insideMainspaceOnly' }
		],
		Geography: [
			{ tag: 'R from name and country', description: 'redirect from the specific name to the briefer name', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from more specific geographic name', description: 'redirect from a geographic location that includes extraneous identifiers such as the county or region of a city', restriction: 'insideMainspaceOnly' }
		]
	},
	'Navigation aids': {
		Navigation: [
			{ tag: 'R to anchor', description: 'dialihkan dari sebuah topik yang tidak mempunyai halamannya sendiri ke bagian yang telha ada di subyek' },
			{
				tag: 'R avoided double redirect',
				description: 'dialihkan dari judul alternatif untuk pengalihan lainnya',
				subgroup: {
					name: 'doubleRedirectTarget',
					type: 'input',
					label: 'Nama tujuan pengalihan',
					tooltip: 'Masukan nama halaman yang akan ditargetkan oleh pengalihan ini jika halamannya bukan pengalihan'
				}
			},
			{ tag: 'R from file metadata link', description: 'redirect of a wikilink created from EXIF, XMP, or other information (i.e. the "metadata" section on some image description pages)', restriction: 'insideMainspaceOnly' },
			{ tag: 'R to list entry', description: 'redirect to a list which contains brief descriptions of subjects not notable enough to have separate articles', restriction: 'insideMainspaceOnly' },

			{ tag: 'R mentioned in hatnote', description: 'redirect from a title that is mentioned in a hatnote at the redirect target' },
			{ tag: 'R to section', description: 'similar to {{R to list entry}}, but when list is organized in sections, such as list of characters in a fictional universe' },
			{ tag: 'R from shortcut', description: 'redirect from a Wikipedia shortcut' },
			{ tag: 'R to subpage', description: 'redirect to a subpage' }
		],
		Disambiguation: [
			{ tag: 'R from ambiguous term', description: 'redirect from an ambiguous page name to a page that disambiguates it. This template should never appear on a page that has "(disambiguation)" in its title, use R to disambiguation page instead' },
			{ tag: 'R to disambiguation page', description: 'redirect to a disambiguation page', restriction: 'disambiguationPagesOnly' },
			{ tag: 'R from incomplete disambiguation', description: 'redirect from a page name that is too ambiguous to be the title of an article and should redirect to an appropriate disambiguation page' },
			{ tag: 'R from incorrect disambiguation', description: 'redirect from a page name with incorrect disambiguation due to an error or previous editorial misconception' },
			{ tag: 'R from other disambiguation', description: 'redirect from a page name with an alternative disambiguation qualifier' },
			{ tag: 'R from unnecessary disambiguation', description: 'redirect from a page name that has an unneeded disambiguation qualifier' }
		],
		'Merge, duplicate & move': [
			{ tag: 'R from duplicated article', description: 'redirect to a similar article in order to preserve its edit history' },
			{ tag: 'R with history', description: 'redirect from a page containing substantive page history, kept to preserve content and attributions' },
			{ tag: 'R from move', description: 'redirect from a page that has been moved/renamed' },
			{ tag: 'R from merge', description: 'redirect from a merged page in order to preserve its edit history' }
		],
		Namespace: [
			{ tag: 'R from remote talk page', description: 'redirect from a talk page in any talk namespace to a corresponding page that is more heavily watched', restriction: 'insideTalkNamespaceOnly' },
			{ tag: 'R to category namespace', description: 'redirect from a page outside the category namespace to a category page' },
			{ tag: 'R to help namespace', description: 'redirect from any page inside or outside of help namespace to a page in that namespace' },
			{ tag: 'R to main namespace', description: 'redirect from a page outside the main-article namespace to an article in mainspace' },
			{ tag: 'R to portal namespace', description: 'redirect from any page inside or outside of portal space to a page in that namespace' },
			{ tag: 'R to project namespace', description: 'redirect from any page inside or outside of project (Wikipedia: or WP:) space to any page in the project namespace' },
			{ tag: 'R to user namespace', description: 'redirect from a page outside the user namespace to a user page (not to a user talk page)', restriction: 'outsideUserspaceOnly' }
		]
	},
	Media: {
		General: [
			{ tag: 'R from album', description: 'redirect from an album to a related topic such as the recording artist or a list of albums', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from band name', description: 'redirect from a musical band or musical group name that redirects an article on a single person, i.e. the band or group leader' },
			{ tag: 'R from book', description: 'redirect from a book title to a more general, relevant article', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from cover song', description: 'redirect from a cover version of a song to the article about the original song this version covers' },
			{ tag: 'R from film', description: 'redirect from a film title that is a subtopic of the redirect target or a title in an alternative language that has been produced in that language', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from journal', description: 'redirect from a trade or professional journal article a more general, relevant Wikipedia article, such as the author or publisher of the article or to the title in an alternative language' },
			{ tag: 'R from lyric', description: 'redirect from a lyric to a song or other source that describes the lyric' },
			{ tag: 'R from meme', description: 'redirect from a name of an internet meme or other pop culture phenomenon that is a subtopic of the redirect target' },
			{ tag: 'R from song', description: 'redirect from a song title to a more general, relevant article' },
			{ tag: 'R from television episode', description: 'redirect from a television episode title to a related work or lists of episodes', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from television program', description: 'redirect from a title of television program, television series or web series that is a subtopic of the redirect target' },
			{ tag: 'R from upcoming film', description: 'redirect from a title that potentially could be expanded into a new article or other type of associated page such as a new template.' },
			{ tag: 'R from work', description: 'redirect from a creative work a related topic such as the author/artist, publisher, or a subject related to the work' }
		],
		Fiction: [
			{ tag: 'R from fictional character', description: 'redirect from a fictional character to a related fictional work or list of characters', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from fictional element', description: 'redirect from a fictional element (such as an object or concept) to a related fictional work or list of similar elements', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from fictional location', description: 'redirect from a fictional location or setting to a related fictional work or list of places', restriction: 'insideMainspaceOnly' }
		]
	},
	Miscellaneous: {
		'Related information': [
			{ tag: 'R to article without mention', description: 'redirect to an article without any mention of the redirected word or phrase', restriction: 'insideMainspaceOnly' },
			{ tag: 'R to decade', description: 'redirect from a year to the decade article', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from domain name', description: 'redirect from a domain name to an article about a website', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from emoji', description: 'redirect from an emoji to an article describing the depicted concept or the emoji itself' },
			{ tag: 'R from phrase', description: 'redirect from a phrase to a more general relevant article covering the topic' },
			{ tag: 'R from list topic', description: 'redirect from the topic of a list to the equivalent list' },
			{ tag: 'R from member', description: 'redirect from a member of a group to a related topic such as the group or organization' },
			{ tag: 'R to related topic', description: 'redirect to an article about a similar topic', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from related word', description: 'redirect from a related word' },
			{ tag: 'R from school', description: 'redirect from a school article that had very little information', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from subtopic', description: 'redirect from a title that is a subtopic of the target article', restriction: 'insideMainspaceOnly' },
			{ tag: 'R to subtopic', description: 'redirect to a subtopic of the redirect\'s title', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from Unicode character', description: 'redirect from a single Unicode character to an article or Wikipedia project page that infers meaning for the symbol', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from Unicode code', description: 'redirect from a Unicode code point to an article about the character it represents', restriction: 'insideMainspaceOnly' }
		],
		'With possibilities': [
			{ tag: 'R with possibilities', description: 'redirect from a specific title to a more general, less detailed article (something which can and should be expanded)' }
		],
		'ISO codes': [
			{ tag: 'R from ISO 4 abbreviation', description: 'redirect from an ISO 4 publication title abbreviation to the unabbreviated title', restriction: 'insideMainspaceOnly' },
			{ tag: 'R from ISO 639 code', description: 'redirect from a title that is an ISO 639 language code to an article about the language', restriction: 'insideMainspaceOnly' }
		],
		Printworthiness: [
			{ tag: 'R printworthy', description: 'redirect from a title that would be helpful in a printed or CD/DVD version of Wikipedia', restriction: 'insideMainspaceOnly' },
			{ tag: 'R unprintworthy', description: 'redirect from a title that would NOT be helpful in a printed or CD/DVD version of Wikipedia', restriction: 'insideMainspaceOnly' }
		]
	}
};

// maintenance tags for FILES start here

Twinkle.tag.fileList = {
	'License and sourcing problem tags': [
		{ label: '{{Better source requested}}: info sumber hanya terdiri dari URL gambar kosong/URL dasar generik', value: 'Better source requested' },
		{ label: '{{Maybe free media}}: sedang ditandai dibawah lisensi tak-bebas, tetapi lisensi bebas mungkin tersedia ', value: 'Maybe free media' },
		{ label: '{{Non-free reduce}}: gambar grafis rendah non-bebas (atau potongan audio terlalu panjang, dll)', value: 'Non-free reduce' },
		{ label: '{{Orphaned non-free revisions}}: penggunaan wajar media dengan revisi lama yang perlu dihapus', value: 'Orphaned non-free revisions' }
	],
	'Wikimedia Commons-related tags': [
		{ label: '{{Copy to Commons}}: media bebas yang harusnya disalin ke Commons', value: 'Copy to Commons' },
		{
			label: '{{Deleted on Commons}}: berkas sebelumnya telah dihapus dari Commons',
			value: 'Deleted on Commons',
			subgroup: {
				type: 'input',
				name: 'deletedOnCommonsName',
				label: 'Nama di Commons:',
				tooltip: 'Nama gambar di Commons (jika berbeda dari nama lokal), mengecualikan Berkas: prefix'
			}
		},
		{
			label: '{{Do not move to Commons}}: berkas tidak sesuai untuk dipindahkan ke Commons',
			value: 'Do not move to Commons',
			subgroup: [
				{
					type: 'input',
					name: 'DoNotMoveToCommons_reason',
					label: 'Alasan:',
					tooltip: 'Alasan mengapa gambarnya tidak harus dimasukkan ke Commons (wajib). If the file is PD in the US but not in country of origin, enter "US only"',
					required: true
				},
				{
					type: 'number',
					name: 'DoNotMoveToCommons_expiry',
					label: 'Tahun kadaluwarsa:',
					min: new Morebits.Date().getFullYear(),
					tooltip: 'Jika berkas ini dapat dipindahkan ke awal Commons di tahun tertentu, anda dapat masukan disini (opsional).'
				}
			]
		},
		{
			label: '{{Keep local}}: meminta salinan lokal dari berkas Commons',
			value: 'Keep local',
			subgroup: {
				type: 'input',
				name: 'keeplocalName',
				label: 'Nama berkas Commons jika berbeda:',
				tooltip: 'Nama gambar di Commons (jika berbeda dari nama lokal), mengecualikan Berkas: prefix:'
			}
		},
		{
			label: '{{Nominated for deletion on Commons}}: berkas dinominasikan untuk dihapus di Commons',
			value: 'Nominated for deletion on Commons',
			subgroup: {
				type: 'input',
				name: 'nominatedOnCommonsName',
				label: 'Nama di Commons:',
				tooltip: 'Nama gambar di Commons (jika berbeda dari nama lokal), mengecualikan Berkas: prefix:'
			}
		}
	],
	'Cleanup tags': [
		{ label: '{{Artifacts}}: PNG mengandung artefak sisa kompresi', value: 'Artifacts' },
		{ label: '{{Bad font}}: SVG menggunakan huruf yang tidak tersedia di peladen miniatur', value: 'Bad font' },
		{ label: '{{Bad format}}: berkas PDF/DOC/... harus diubah ke format yang lebih umum/berguna', value: 'Bad format' },
		{ label: '{{Bad GIF}}: GIF yang harus diganti dengan PNG, JPEG, atau SVG', value: 'Bad GIF' },
		{ label: '{{Bad JPEG}}: JPEG yang harus diganti dengan PNG atau SVG', value: 'Bad JPEG' },
		{ label: '{{Bad SVG}}: SVG dengan campuran grafis buram dan kotak-kotak', value: 'Bad SVG' },
		{ label: '{{Bad trace}}: sisa SVG yang perlu dibersihkan', value: 'Bad trace' },
		{
			label: '{{Cleanup image}}: perapian umum', value: 'Cleanup image',
			subgroup: {
				type: 'input',
				name: 'cleanupimageReason',
				label: 'Alasan:',
				tooltip: 'Masukan alasan untuk dirapikan (wajib)',
				required: true
			}
		},
		{ label: '{{ClearType}}: gambar (selain tangkapan layar) dengan anti-aliasing ClearType', value: 'ClearType' },
		{ label: '{{Fake SVG}}: SVG solely containing raster graphics without true vector content', value: 'Fake SVG' },
		{ label: '{{Imagewatermark}}: gambar mengandung tanda air yang tampak', value: 'Imagewatermark' },
		{ label: '{{NoCoins}}: gambar menggunakan koin untuk mengindikasikan skala', value: 'NoCoins' },
		{ label: '{{Overcompressed JPEG}}: JPEG dengan artefak tingkat tinggi', value: 'Overcompressed JPEG' },
		{ label: '{{Opaque}}: latar belakang yang perlu dibuat transparan', value: 'Opaque' },
		{ label: '{{Remove border}}: garis pinggir, bagian putih, dsb. yang tak diperlukan', value: 'Remove border' },
		{
			label: '{{Rename media}}: Berkas harus diganti nama menurut kriteria pada [[WP:FMV]]',
			value: 'Rename media',
			subgroup: [
				{
					type: 'input',
					name: 'renamemediaNewname',
					label: 'Nama baru:',
					tooltip: 'Masukan nama baru untuk gambar (opsional)'
				},
				{
					type: 'input',
					name: 'renamemediaReason',
					label: 'Alasan:',
					tooltip: 'Masukan alasan penggantian nama (opsional)'
				}
			]
		},
		{ label: '{{Should be PNG}}: GIF atau JPEG harus berbentuk "lossless', value: 'Should be PNG' },
		{
			label: '{{Should be SVG}}: PNG, GIF atau JPEG harus grafik vektor', value: 'Should be SVG',
			subgroup: {
				name: 'svgCategory',
				type: 'select',
				list: [
				{ label: '{{Should be SVG|other}}', value: 'other' },
				{ label: '{{Should be SVG|alphabet}}: gambar karakter, contoh huruf, dsb.', value: 'alphabet' },
				{ label: '{{Should be SVG|chemical}}: diagram kimia, dsb.', value: 'chemical' },
				{ label: '{{Should be SVG|circuit}}: diagram sirkuit elektronik, dsb.', value: 'circuit' },
				{ label: '{{Should be SVG|coat of arms}}: lambang negara', value: 'coat of arms' },
				{ label: '{{Should be SVG|diagram}}: diagram yang tidak sesuai dengan subkategori lain', value: 'diagram' },
				{ label: '{{Should be SVG|emblem}}: emblem, logo bebas, dsb.', value: 'emblem' },
				{ label: '{{Should be SVG|fair use}}: gambar atau logo untuk penggunaan wajar', value: 'fair use' },
				{ label: '{{Should be SVG|flag}}: bendera', value: 'flag' },
				{ label: '{{Should be SVG|graph}}: plot visual data', value: 'graph' },
				{ label: '{{Should be SVG|logo}}: logo', value: 'logo' },
				{ label: '{{Should be SVG|map}}: peta', value: 'map' },
				{ label: '{{Should be SVG|music}}: notasi musik, dsb.', value: 'music' },
				{ label: '{{Should be SVG|physical}}: gambar "realistis" dari objek fisik, manusia, dsb.', value: 'physical' },
				{ label: '{{Should be SVG|symbol}}: simbol, ikon lainnya, dsb.', value: 'symbol' }
				]
			}
		},
		{ label: '{{Harus teks}}: gambar harus diganti dengan teks, tabel, atau kode matematika', value: 'Should be text' }
	],
	'Tag kualitas gambar': [
		{ label: '{{Image hoax}}: Gambar mungkin memanipulasi atau sebuah hoaks', value: 'Image hoax' },
		{ label: '{{Image-blownout}}', value: 'Image-blownout' },
		{ label: '{{Image-out-of-focus}}', value: 'Image-out-of-focus' },
		{
			label: '{{Image-Poor-Quality}}', value: 'Image-Poor-Quality',
			subgroup: {
				type: 'input',
				name: 'ImagePoorQualityReason',
				label: 'Alasan:',
				tooltip: 'Masukan alasan mengapa kualitas gambarnya buruk (wajib)',
				required: true
			}
		},
		{ label: '{{Image-underexposure}}', value: 'Image-underexposure' },
		{
			label: '{{Low quality chem}}: struktur kimia yang dipertentangkan', value: 'Low quality chem',
			subgroup: {
				type: 'input',
				name: 'lowQualityChemReason',
				label: 'Alasan:',
				tooltip: 'Masukan alasan mengapa diagramnya diperdebatkan (dibutuhkan)',
				required: true
			}
		}
	],
	'Replacement tags': [
		{ label: '{{Obsolete}}: versi lebih baik tersedia', value: 'Obsolete' },
		{ label: '{{PNG version available}}', value: 'Versi PNG tersedia' },
		{ label: '{{Vector version available}}', value: 'Versi Vektor tersedia' }
	]
};
Twinkle.tag.fileList['Replacement tags'].forEach((el) => {
	el.subgroup = {
		type: 'input',
		label: 'Berkas pengganti:',
		tooltip: 'Masukan nama dari berkas yang mengganti berkas saat ini (wajib)',
		name: el.value.replace(/ /g, '_') + 'File',
		required: true
	};
});

Twinkle.tag.callbacks = {
	article: function articleCallback(pageobj) {

		// Remove tags that become superfluous with this action
		let pageText = pageobj.getPageText().replace(/\{\{\s*([Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, '');
		const params = pageobj.getCallbackParameters();

		/**
		 * Saves the page following the removal of tags if any. The last step.
		 * Called from removeTags()
		 */
		const postRemoval = function() {
			if (params.tagsToRemove.length) {
				// Remove empty {{multiple issues}} if found
				pageText = pageText.replace(/\{\{(multiple ?issues|article ?issues|mi)\s*\|\s*\}\}\n?/im, '');
				// Remove single-element {{multiple issues}} if found
				pageText = pageText.replace(/\{\{(?:multiple ?issues|article ?issues|mi)\s*\|\s*(\{\{[^}]+\}\})\s*\}\}/im, '$1');
			}

			// Build edit summary
			const makeSentence = function(array) {
				if (array.length < 3) {
					return array.join(' dan ');
				}
				const last = array.pop();
				return array.join(', ') + ', dan ' + last;
			};
			const makeTemplateLink = function(tag) {
				let text = '{{[[';
				// if it is a custom tag with a parameter
				if (tag.includes('|')) {
					tag = tag.slice(0, tag.indexOf('|'));
				}
				text += tag.includes(':') ? tag : 'Templat:' + tag + '|' + tag;
				return text + ']]}}';
			};

			let summaryText;
			const addedTags = params.tags.map(makeTemplateLink);
			const removedTags = params.tagsToRemove.map(makeTemplateLink);
			if (addedTags.length) {
				summaryText = 'Ditambahkan ' + makeSentence(addedTags);
				summaryText += removedTags.length ? '; dan dihilangkan ' + makeSentence(removedTags) : '';
			} else {
				summaryText = 'Dihilangkan ' + makeSentence(removedTags);
			}
			summaryText += ' tag' + (addedTags.length + removedTags.length > 1 ? 's' : '');
			if (params.reason) {
				summaryText += ': ' + params.reason;
			}

			// avoid truncated summaries
			if (summaryText.length > 499) {
				summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
			}

			pageobj.setPageText(pageText);
			pageobj.setEditSummary(summaryText);
			if ((mw.config.get('wgNamespaceNumber') === 0 && Twinkle.getPref('watchTaggedVenues').includes('articles')) || (mw.config.get('wgNamespaceNumber') === 118 && Twinkle.getPref('watchTaggedVenues').includes('drafts'))) {
				pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
			}
			pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
			pageobj.setCreateOption('nocreate');
			pageobj.save(() => {
				// COI: Start the discussion on the talk page (mainspace only)
				if (params.coiReason) {
					const coiTalkPage = new Morebits.wiki.Page('Pembicaraan:' + Morebits.pageNameNorm, 'Mulai diskusi pada halaman pembicaraan ');
					coiTalkPage.setNewSectionText(params.coiReason + ' ~~~~');
					coiTalkPage.setNewSectionTitle('Tag COI (' + new Morebits.Date(pageobj.getLoadTime()).format('MMMM Y', 'utc') + ')');
					coiTalkPage.setChangeTags(Twinkle.changeTags);
					coiTalkPage.setCreateOption('recreate');
					coiTalkPage.newSection();
				}

				// Special functions for merge tags
				// Post a rationale on the talk page (mainspace only)
				if (params.mergeReason) {
					const mergeTalkPage = new Morebits.wiki.Page('Talk:' + params.discussArticle, 'Menambahkan tag di halaman pembicaraan ');
					mergeTalkPage.setNewSectionText(params.mergeReason.trim() + ' ~~~~');
					mergeTalkPage.setNewSectionTitle(params.talkDiscussionTitleLinked);
					mergeTalkPage.setChangeTags(Twinkle.changeTags);
					mergeTalkPage.setWatchlist(Twinkle.getPref('watchMergeDiscussions'));
					mergeTalkPage.setCreateOption('recreate');
					mergeTalkPage.newSection();
				}
				// Tag the target page (if requested)
				if (params.mergeTagOther) {
					let otherTagName = 'Merge';
					if (params.mergeTag === 'Merge from') {
						otherTagName = 'Merge to';
					} else if (params.mergeTag === 'Merge to') {
						otherTagName = 'Merge from';
					}
					const newParams = {
						tags: [otherTagName],
						tagsToRemove: [],
						tagsToRemain: [],
						mergeTarget: Morebits.pageNameNorm,
						discussArticle: params.discussArticle,
						talkDiscussionTitle: params.talkDiscussionTitle,
						talkDiscussionTitleLinked: params.talkDiscussionTitleLinked
					};
					const otherpage = new Morebits.wiki.Page(params.mergeTarget, 'Menandai halaman lain (' +
						params.mergeTarget + ')');
					otherpage.setChangeTags(Twinkle.changeTags);
					otherpage.setCallbackParameters(newParams);
					otherpage.load(Twinkle.tag.callbacks.article);
				}

				// Special functions for {{not English}} and {{rough translation}}
				// Post at WP:PNT (mainspace only)
				if (params.translationPostAtPNT) {
					const pntPage = new Morebits.wiki.Page('Wikipedia:Pages needing translation into English',
						'Listing article at Wikipedia:Pages needing translation into English');
					pntPage.setFollowRedirect(true);
					pntPage.load((pageobj) => {
						const oldText = pageobj.getPageText();

						const lang = params.translationLanguage;
						const reason = params.translationComments;

						let templateText;

						let text, summary;
						if (params.tags.includes('Rough translation')) {
							templateText = '{{subst:Dual fluency request|pg=' + Morebits.pageNameNorm + '|Language=' +
							(lang || 'uncertain') + '|Comments=' + reason.trim() + '}} ~~~~';
							// Place in section == Translated pages that could still use some cleanup ==
							text = oldText + '\n\n' + templateText;
							summary = 'Perapian terjamahan diminta pada ';
						} else if (params.tags.includes('Not English')) {
							templateText = '{{subst:Translation request|pg=' + Morebits.pageNameNorm + '|Language=' +
							(lang || 'uncertain') + '|Comments=' + reason.trim() + '}} ~~~~';
							// Place in section == Pages for consideration ==
							text = oldText.replace(/\n+(==\s?Halaman yang diterjemahkan masih perlu perapian\s?==)/,
								'\n\n' + templateText + '\n\n$1');
							summary = 'Penerjemahan' + (lang ? ' dari ' + lang : '') + ' diminta pada ';
						}

						if (text === oldText) {
							pageobj.getStatusElement().error('gagal untuk menemukan tempat untuk diskusi');
							return;
						}
						pageobj.setPageText(text);
						pageobj.setEditSummary(summary + ' [[:' + Morebits.pageNameNorm + ']]');
						pageobj.setChangeTags(Twinkle.changeTags);
						pageobj.setCreateOption('recreate');
						pageobj.save();
					});
				}
				// Notify the user ({{Not English}} only)
				if (params.translationNotify) {
					new Morebits.wiki.Page(Morebits.pageNameNorm).lookupCreation((innerPageobj) => {
						const initialContrib = innerPageobj.getCreator();

						// Disallow warning yourself
						if (initialContrib === mw.config.get('wgUserName')) {
							innerPageobj.getStatusElement().warn('Anda (' + initialContrib + ') membuat halaman ini; melewati notifikasi pengguna');
							return;
						}

						const userTalkPage = new Morebits.wiki.Page('Pembicaraan pengguna:' + initialContrib,
							'Memberitahu penyunting awal (' + initialContrib + ')');
						userTalkPage.setNewSectionTitle('Artikel anda [[' + Morebits.pageNameNorm + ']]');
						userTalkPage.setNewSectionText('{{subst:uw-notenglish|1=' + Morebits.pageNameNorm +
							(params.translationPostAtPNT ? '' : '|nopnt=yes') + '}} ~~~~');
						userTalkPage.setEditSummary('Pemberitahua: Tolong gunakan Bahasa Indonesia saat berkontribusi ke Wikipedia Indonesia.');
						userTalkPage.setChangeTags(Twinkle.changeTags);
						userTalkPage.setCreateOption('recreate');
						userTalkPage.setFollowRedirect(true, false);
						userTalkPage.newSection();
					});
				}
			});

			if (params.patrol) {
				pageobj.triage();
			}
		};

		/**
		 * Removes the existing tags that were deselected (if any)
		 * Calls postRemoval() when done
		 */
		const removeTags = function removeTags() {

			if (params.tagsToRemove.length === 0) {
				postRemoval();
				return;
			}

			Morebits.Status.info('Info', 'Menghapus tag yang dibatalkan pilih yang sudah tersedia');

			const getRedirectsFor = [];

			// Remove the tags from the page text, if found in its proper name,
			// otherwise moves it to `getRedirectsFor` array earmarking it for
			// later removal
			params.tagsToRemove.forEach((tag) => {
				const tagRegex = new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]+)?\\}\\}\\n?');

				if (tagRegex.test(pageText)) {
					pageText = pageText.replace(tagRegex, '');
				} else {
					getRedirectsFor.push('Templat:' + tag);
				}
			});

			if (!getRedirectsFor.length) {
				postRemoval();
				return;
			}

			// Remove tags which appear in page text as redirects
			const api = new Morebits.wiki.Api('Mengambil templat pengalihan', {
				action: 'query',
				prop: 'linkshere',
				titles: getRedirectsFor.join('|'),
				redirects: 1, // follow redirect if the class name turns out to be a redirect page
				lhnamespace: '10', // template namespace only
				lhshow: 'redirect',
				lhlimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
				format: 'json'
			}, ((apiobj) => {
				const pages = apiobj.getResponse().query.pages.filter((p) => !p.missing && !!p.linkshere);
				pages.forEach((page) => {
					let removed = false;
					page.linkshere.concat({title: page.title}).forEach((el) => {
						const tag = el.title.slice(9);
						const tagRegex = new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]*)?\\}\\}\\n?');
						if (tagRegex.test(pageText)) {
							pageText = pageText.replace(tagRegex, '');
							removed = true;
							return false; // break out of $.each
						}
					});
					if (!removed) {
						Morebits.Status.warn('Info', 'Gagal untuk menemukan {{' +
						page.title.slice(9) + '}} di halaman... mengecualikan');
					}

				});

				postRemoval();

			}));
			api.post();

		};

		if (!params.tags.length) {
			removeTags();
			return;
		}

		let tagRe, tagText = '', tags = [];
		const groupableTags = [], groupableExistingTags = [];
		// Executes first: addition of selected tags

		/**
		 * Updates `tagText` with the syntax of `tagName` template with its parameters
		 *
		 * @param {number} tagIndex
		 * @param {string} tagName
		 */
		const addTag = function articleAddTag(tagIndex, tagName) {
			let currentTag = '';
			if (tagName === 'Uncategorized' || tagName === 'Improve categories') {
				pageText += '\n\n{{' + tagName + '|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}';
			} else {
				currentTag += '{{' + tagName;
				// fill in other parameters, based on the tag

				const subgroupObj = Twinkle.tag.article.flatObject[tagName] &&
					Twinkle.tag.article.flatObject[tagName].subgroup;
				if (subgroupObj) {
					const subgroups = Array.isArray(subgroupObj) ? subgroupObj : [ subgroupObj ];
					subgroups.forEach((gr) => {
						if (gr.parameter && (params[gr.name] || gr.required)) {
							currentTag += '|' + gr.parameter + '=' + (params[gr.name] || '');
						}
					});
				}

				switch (tagName) {
					case 'Not English':
					case 'Rough translation':
						if (params.translationPostAtPNT) {
							currentTag += '|listed=yes';
						}
						break;
					case 'Merge':
					case 'Merge to':
					case 'Merge from':
						params.mergeTag = tagName;
						// normalize the merge target for now and later
						params.mergeTarget = Morebits.string.toUpperCaseFirstChar(params.mergeTarget.replace(/_/g, ' '));

						currentTag += '|' + params.mergeTarget;

						// link to the correct section on the talk page, for article space only
						if (mw.config.get('wgNamespaceNumber') === 0 && (params.mergeReason || params.discussArticle)) {
							if (!params.discussArticle) {
								// discussArticle is the article whose talk page will contain the discussion
								params.discussArticle = tagName === 'Merge to' ? params.mergeTarget : mw.config.get('wgTitle');
								// nonDiscussArticle is the article which won't have the discussion
								params.nonDiscussArticle = tagName === 'Merge to' ? mw.config.get('wgTitle') : params.mergeTarget;
								const direction = '[[' + params.nonDiscussArticle + ']]' + (params.mergeTag === 'Merge' ? ' dengan ' : ' ke ') + '[[' + params.discussArticle + ']]';
								params.talkDiscussionTitleLinked = 'Pengusulan penggabungan dari ' + direction;
								params.talkDiscussionTitle = params.talkDiscussionTitleLinked.replace(/\[\[(.*?)\]\]/g, '$1');
							}
							const titleWithSectionRemoved = params.discussArticle.replace(/^([^#]*)#.*$/, '$1'); // If article name is Test#Section, delete #Section
							currentTag += '|discuss=Talk:' + titleWithSectionRemoved + '#' + params.talkDiscussionTitle;
						}
						break;
					default:
						break;
				}

				currentTag += '|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}\n';
				tagText += currentTag;
			}
		};

		/**
		 * Adds the tags which go outside {{multiple issues}}, either because
		 * these tags aren't supported in {{multiple issues}} or because
		 * {{multiple issues}} is not being added to the page at all
		 */
		const addUngroupedTags = function() {
			$.each(tags, addTag);

			// Insert tag after short description or any hatnotes,
			// as well as deletion/protection-related templates
			const wikipage = new Morebits.wikitext.Page(pageText);
			const templatesAfter = Twinkle.hatnoteRegex +
				// Protection templates
				'pp|pp-.*?|' +
				// CSD
				'db|delete|db-.*?|speedy deletion-.*?|' +
				// PROD
				'(?:proposed deletion|prod blp)\\/dated(?:\\s*\\|(?:concern|user|timestamp|help).*)+|' +
				// not a hatnote, but sometimes under a CSD or AfD
				'salt|proposed deletion endorsed';
			// AfD is special, as the tag includes html comments before and after the actual template
			// trailing whitespace/newline needed since this subst's a newline
			const afdRegex = '(?:<!--.*UP.*\\n\\{\\{(?:Usulan penghapusan\\/dated|AfDM).*\\}\\}\\n<!--.*(?:\\n<!--.*)?UP.*(?:\\s*\\n))?';
			pageText = wikipage.insertAfterTemplates(tagText, templatesAfter, null, afdRegex).getText();

			removeTags();
		};

		// Separate tags into groupable ones (`groupableTags`) and non-groupable ones (`tags`)
		params.tags.forEach((tag) => {
			tagRe = new RegExp('\\{\\{' + tag + '(\\||\\}\\})', 'im');
			// regex check for preexistence of tag can be skipped if in canRemove mode
			if (Twinkle.tag.canRemove || !tagRe.exec(pageText)) {
				// condition Twinkle.tag.article.tags[tag] to ensure that its not a custom tag
				// Custom tags are assumed non-groupable, since we don't know whether MI template supports them
				if (Twinkle.tag.article.flatObject[tag] && !Twinkle.tag.article.flatObject[tag].excludeMI) {
					groupableTags.push(tag);
				} else {
					tags.push(tag);
				}
			} else {
				if (tag === 'Merge from' || tag === 'History merge') {
					tags.push(tag);
				} else {
					Morebits.Status.warn('Info', 'Sudah ditemukan {{' + tag +
						'}} di artikel...mengecualikan');
					// don't do anything else with merge tags
					if (['Merge', 'Merge to'].includes(tag)) {
						params.mergeTarget = params.mergeReason = params.mergeTagOther = null;
					}
				}
			}
		});

		// To-be-retained existing tags that are groupable
		params.tagsToRemain.forEach((tag) => {
			// If the tag is unknown to us, we consider it non-groupable
			if (Twinkle.tag.article.flatObject[tag] && !Twinkle.tag.article.flatObject[tag].excludeMI) {
				groupableExistingTags.push(tag);
			}
		});

		const miTest = /\{\{(multiple ?issues|article ?issues|mi)(?!\s*\|\s*section\s*=)[^}]+\{/im.exec(pageText);

		if (miTest && groupableTags.length > 0) {
			Morebits.Status.info('Info', 'menambahkan tag tersedia di dalam tag {{multiple issues}} yang sudah ada');

			tagText = '';
			$.each(groupableTags, addTag);

			const miRegex = new RegExp('(\\{\\{\\s*' + miTest[1] + '\\s*(?:\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?)\\}\\}\\s*', 'im');
			pageText = pageText.replace(miRegex, '$1' + tagText + '}}\n');
			tagText = '';

			addUngroupedTags();

		} else if (params.group && !miTest && (groupableExistingTags.length + groupableTags.length) >= 2) {
			Morebits.Status.info('Info', 'Menggabungkan tag yang tersedia dalam {{multiple issues}}');

			tagText += '{{Multiple issues|\n';

			/**
			 * Adds newly added tags to MI
			 */
			const addNewTagsToMI = function() {
				$.each(groupableTags, addTag);
				tagText += '}}\n';

				addUngroupedTags();
			};

			const getRedirectsFor = [];

			// Reposition the tags on the page into {{multiple issues}}, if found with its
			// proper name, else moves it to `getRedirectsFor` array to be handled later
			groupableExistingTags.forEach((tag) => {
				const tagRegex = new RegExp('(\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]+)?\\}\\}\\n?)');
				if (tagRegex.test(pageText)) {
					tagText += tagRegex.exec(pageText)[1];
					pageText = pageText.replace(tagRegex, '');
				} else {
					getRedirectsFor.push('Templat:' + tag);
				}
			});

			if (!getRedirectsFor.length) {
				addNewTagsToMI();
				return;
			}

			const api = new Morebits.wiki.Api('Mengambil templat pengalihan', {
				action: 'query',
				prop: 'linkshere',
				titles: getRedirectsFor.join('|'),
				redirects: 1,
				lhnamespace: '10', // template namespace only
				lhshow: 'redirect',
				lhlimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
				format: 'json'
			}, ((apiobj) => {
				const pages = apiobj.getResponse().query.pages.filter((p) => !p.missing && !!p.linkshere);
				pages.forEach((page) => {
					let found = false;
					page.linkshere.forEach((el) => {
						const tag = el.title.slice(9);
						const tagRegex = new RegExp('(\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]*)?\\}\\}\\n?)');
						if (tagRegex.test(pageText)) {
							tagText += tagRegex.exec(pageText)[1];
							pageText = pageText.replace(tagRegex, '');
							found = true;
							return false; // break out of $.each
						}
					});
					if (!found) {
						Morebits.Status.warn('Info', 'gagal untuk menemukan {{' +
						page.title.slice(9) + '}} di halaman...');
					}
				});
				addNewTagsToMI();
			}));
			api.post();

		} else {
			tags = tags.concat(groupableTags);
			addUngroupedTags();
		}
	},

	redirect: function redirect(pageobj) {
		const params = pageobj.getCallbackParameters(),
			tags = [];
		let pageText = pageobj.getPageText(),
			tagRe, tagText = '',
			summaryText = 'Ditambahkan',
			i;

		for (i = 0; i < params.tags.length; i++) {
			tagRe = new RegExp('(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im');
			if (!tagRe.exec(pageText)) {
				tags.push(params.tags[i]);
			} else {
				Morebits.Status.warn('Info', 'Sudah ditemukan {{' + params.tags[i] +
					'}} di pengalihan...mengecualikan');
			}
		}

		const addTag = function redirectAddTag(tagIndex, tagName) {
			tagText += '\n{{' + tagName;
			if (tagName === 'R from alternative language') {
				if (params.altLangFrom) {
					tagText += '|from=' + params.altLangFrom;
				}
				if (params.altLangTo) {
					tagText += '|to=' + params.altLangTo;
				}
			} else if (tagName === 'R avoided double redirect' && params.doubleRedirectTarget) {
				tagText += '|1=' + params.doubleRedirectTarget;
			}
			tagText += '}}';

			if (tagIndex > 0) {
				if (tagIndex === (tags.length - 1)) {
					summaryText += ' dan';
				} else if (tagIndex < (tags.length - 1)) {
					summaryText += ',';
				}
			}

			summaryText += ' {{[[:' + (tagName.includes(':') ? tagName : 'Templat:' + tagName + '|' + tagName) + ']]}}';
		};

		if (!tags.length) {
			Morebits.Status.warn('Info', 'Tidak ada tag tersisa untuk ditambahkan');
		}

		tags.sort();
		$.each(tags, addTag);

		// Check for all Rcat shell redirects (from #433)
		if (pageText.match(/{{(?:redr|ini adalah pengalihan|r(?:edirect)?(?:.?cat.*)?[ _]?sh)/i)) {
			// Regex inspired by [[User:Kephir/gadgets/sagittarius.js]] ([[Special:PermaLink/831402893]])
			const oldTags = pageText.match(/(\s*{{[A-Za-z\s]+\|(?:\s*1=)?)((?:[^|{}]|{{[^}]+}})+)(}})\s*/i);
			pageText = pageText.replace(oldTags[0], oldTags[1] + tagText + oldTags[2] + oldTags[3]);
		} else {
			// Fold any pre-existing Rcats into taglist and under Rcatshell
			const pageTags = pageText.match(/\s*{{R(?:edirect)? .*?}}/img);
			let oldPageTags = '';
			if (pageTags) {
				pageTags.forEach((pageTag) => {
					const pageRe = new RegExp(Morebits.string.escapeRegExp(pageTag), 'img');
					pageText = pageText.replace(pageRe, '');
					pageTag = pageTag.trim();
					oldPageTags += '\n' + pageTag;
				});
			}
			pageText = pageText.trim() + '\n\n{{Redirect category shell|' + tagText + oldPageTags + '\n}}';
		}

		summaryText += (tags.length > 0 ? ' tag' + (tags.length > 1 ? 's' : ' ') : ' {{[[Templat:Redirect category shell|Redirect category shell]]}}') + ' ke pengalihan';

		// avoid truncated summaries
		if (summaryText.length > 499) {
			summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
		}

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText);
		if (Twinkle.getPref('watchTaggedVenues').includes('redirects')) {
			pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
		}
		pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if (params.patrol) {
			pageobj.triage();
		}

	},

	file: function twinkletagCallbacksFile(pageobj) {
		let text = pageobj.getPageText();
		const params = pageobj.getCallbackParameters();
		let summary = 'Adding ';

		// Add maintenance tags
		if (params.tags.length) {

			let tagtext = '', currentTag;
			$.each(params.tags, (k, tag) => {
				// when other commons-related tags are placed, remove "move to Commons" tag
				if (['Keep local', 'Do not move to Commons'].includes(tag)) {
					text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|pindahkan ke wikimedia commons|salin ke wikimedia commons)[^}]*\}\}/gi, '');
				}

				currentTag = tag;

				switch (tag) {
					case 'Keep local':
						if (params.keeplocalName !== '') {
							currentTag += '|1=' + params.keeplocalName;
						}
						break;
					case 'Rename media':
						if (params.renamemediaNewname !== '') {
							currentTag += '|1=' + params.renamemediaNewname;
						}
						if (params.renamemediaReason !== '') {
							currentTag += '|2=' + params.renamemediaReason;
						}
						break;
					case 'Cleanup image':
						currentTag += '|1=' + params.cleanupimageReason;
						break;
					case 'Image-Poor-Quality':
						currentTag += '|1=' + params.ImagePoorQualityReason;
						break;
					case 'Image hoax':
						currentTag += '|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}';
						break;
					case 'Low quality chem':
						currentTag += '|1=' + params.lowQualityChemReason;
						break;
					case 'Vector version available':
						text = text.replace(/\{\{((convert to |convertto|should be |shouldbe|to)?svg|badpng|vectorize)[^}]*\}\}/gi, '');
						/* falls through */
					case 'PNG version available':
						/* falls through */
					case 'Obsolete':
						currentTag += '|1=' + params[tag.replace(/ /g, '_') + 'File'];
						break;
					case 'Do not move to Commons':
						currentTag += '|reason=' + params.DoNotMoveToCommons_reason;
						if (params.DoNotMoveToCommons_expiry) {
							currentTag += '|expiry=' + params.DoNotMoveToCommons_expiry;
						}
						break;
					case 'Orphaned non-free revisions':
						currentTag = 'subst:' + currentTag; // subst
						// remove {{non-free reduce}} and redirects
						text = text.replace(/\{\{\s*(Templat\s*:\s*)?(Non-free reduce|FairUseReduce|Fairusereduce|Fair Use Reduce|Fair use reduce|Reduce size|Reduce|Fair-use reduce|Image-toobig|Comic-ovrsize-img|Non-free-reduce|Nfr|Smaller image|Nonfree reduce)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
						currentTag += '|date={{subst:date}}';
						break;
					case 'Copy to Commons':
						currentTag += '|human=' + mw.config.get('wgUserName');
						break;
					case 'Should be SVG':
						currentTag += '|' + params.svgCategory;
						break;
					case 'Nominated for deletion on Commons':
						if (params.nominatedOnCommonsName !== '') {
							currentTag += '|1=' + params.nominatedOnCommonsName;
						}
						break;
					case 'Deleted on Commons':
						if (params.deletedOnCommonsName !== '') {
							currentTag += '|1=' + params.deletedOnCommonsName;
						}
						break;
					default:
						break; // don't care
				}

				currentTag = '{{' + currentTag + '}}\n';

				tagtext += currentTag;
				summary += '{{' + tag + '}}, ';
			});

			if (!tagtext) {
				pageobj.getStatusElement().warn('Pengguna membatalkan tindakan, menghentikan');
				return;
			}

			text = tagtext + text;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary(summary.substring(0, summary.length - 2));
		pageobj.setChangeTags(Twinkle.changeTags);
		if (Twinkle.getPref('watchTaggedVenues').includes('files')) {
			pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
		}
		pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if (params.patrol) {
			pageobj.triage();
		}
	}
};

/**
 * Given an array of incompatible tags, check if we have two or more selected
 *
 * @param {Array} incompatibleTags
 * @param {Array} tagsToCheck
 * @param {string} [extraMessage]
 * @return {true|undefined}
 */
Twinkle.tag.checkIncompatible = function(incompatibleTags, tagsToCheck, extraMessage = null) {
	const count = incompatibleTags.filter((tag) => tagsToCheck.includes(tag)).length;
	if (count > 1) {
		const incompatibleTagsString = '{{' + incompatibleTags.join('}}, {{') + '}}';
		let message = 'Tolong pilih salah satu dari: ' + incompatibleTagsString + '.';
		message += extraMessage ? ' ' + extraMessage : '';
		alert(message);
		return true;
	}
};

Twinkle.tag.callback.evaluate = function twinkletagCallbackEvaluate(e) {
	const form = e.target;
	const params = Morebits.QuickForm.getInputData(form);

	// Validation

	// We could theoretically put them all checkIncompatible calls in a
	// forEach loop, but it's probably clearer not to have [[array one],
	// [array two]] devoid of context.
	switch (Twinkle.tag.mode) {
		case 'article':
			params.tagsToRemove = form.getUnchecked('existingTags'); // not in `input`
			params.tagsToRemain = params.existingTags || []; // container not created if none present

			if ((params.tags.includes('Merge')) || (params.tags.includes('Merge from')) ||
				(params.tags.includes('Merge to'))) {
				if (Twinkle.tag.checkIncompatible(['Merge', 'Merge from', 'Merge to'], params.tags, 'Jika beberapa penggabungan dibutuhkan, gunakan {{Merge}} dan pisahkan nama artikel dengan garis lurus (walaupun di kasus ini Twinkle tidak dapat menandai artikel lainnya secara otomatis).')) {
					return;
				}
				if ((params.mergeTagOther || params.mergeReason) && params.mergeTarget.includes('|')) {
					alert('Menandai beberapa artikel dalam sebuah penggabungan, dan memulai diskusi beberapa artikel tidak didukung untuk saat ini. Harap matikan "tag other article", dan/atau batalkan centang kotak "alasan", dan coba lagi.');
					return;
				}
			}

			if (Twinkle.tag.checkIncompatible(['Not English', 'Rough translation'], params.tags)) {
				return;
			}
			break;

		case 'file':
			if (Twinkle.tag.checkIncompatible(['Bad GIF', 'Bad JPEG', 'Bad SVG', 'Bad format'], params.tags)) {
				return;
			}
			if (Twinkle.tag.checkIncompatible(['Should be PNG', 'Should be SVG', 'Should be text'], params.tags)) {
				return;
			}
			if (Twinkle.tag.checkIncompatible(['Bad SVG', 'Vector version available'], params.tags)) {
				return;
			}
			if (Twinkle.tag.checkIncompatible(['Bad JPEG', 'Overcompressed JPEG'], params.tags)) {
				return;
			}
			if (Twinkle.tag.checkIncompatible(['PNG version available', 'Vector version available'], params.tags)) {
				return;
			}

			// Get extension from either mime-type or title, if not present (e.g., SVGs)
			var extension = ((extension = $('.mime-type').text()) && extension.split(/\//)[1]) || mw.Title.newFromText(Morebits.pageNameNorm).getExtension();
			if (extension) {
				const extensionUpper = extension.toUpperCase();

				// What self-respecting file format has *two* extensions?!
				if (extensionUpper === 'JPG') {
					extension = 'JPEG';
				}

				// Check that selected templates make sense given the file's extension.

				// {{Bad GIF|JPEG|SVG}}, {{Fake SVG}}
				if (extensionUpper !== 'GIF' && params.tags.includes('Bad GIF')) {
					alert('Ini tampak seperti berkas ' + extension + 'jadi {{Bad GIF}} tidak sesuai.');
					return;
				} else if (extensionUpper !== 'JPEG' && params.tags.includes('Bad JPEG')) {
					alert('Ini tampak seperti berkas ' + extension + 'jadi {{Bad JPEG}} tidak sesuai.');
					return;
				} else if (extensionUpper !== 'SVG' && params.tags.includes('Bad SVG')) {
					alert('Ini tampak seperti berkas ' + extension + 'jadi {{Bad SVG}} tidak sesuai.');
					return;
				} else if (extensionUpper !== 'SVG' && params.tags.includes('Fake SVG')) {
					alert('Ini tampak seperti berkas ' + extension + 'jadi {{Fake SVG}} tidak sesuai.');
					return;
				}

				// {{Should be PNG|SVG}}
				if (params.tags.includes('Should be ' + extensionUpper)) {
					alert('This is already a ' + extension + 'jadi {{Should be ' + extensionUpper + '}} tidak sesuai.');
					return;
				}

				// {{Overcompressed JPEG}}
				if (params.tags.includes('Overcompressed JPEG') && extensionUpper !== 'JPEG') {
					alert('Ini tampak seperti berkas ' + extension + 'jadi {{Overcompressed JPEG}} tidak dimasukkan.');
					return;
				}

				// {{Bad trace}} and {{Bad font}}
				if (extensionUpper !== 'SVG') {
					if (params.tags.includes('Bad trace')) {
						alert('Ini tampak seperti berkas ' + extension + 'jadi {{Bad trace}} tidak dimasukkan.');
						return;
					} else if (params.tags.includes('Bad font')) {
						alert('Ini tampak seperti berkas ' + extension + 'jadi {{Bad font}} tidak dimasukkan.');
						return;
					}
				}
			}

			// {{Do not move to Commons}}
			if (
				params.tags.includes('Do not move to Commons') &&
				params.DoNotMoveToCommons_expiry &&
				(
					!/^2\d{3}$/.test(params.DoNotMoveToCommons_expiry) ||
					parseInt(params.DoNotMoveToCommons_expiry, 10) <= new Date().getFullYear()
				)
			) {
				alert('Harus tahun berikutnya yang valid.');
				return;
			}

			break;

		case 'redirect':
			if (Twinkle.tag.checkIncompatible(['R printworthy', 'R unprintworthy'], params.tags)) {
				return;
			}
			if (Twinkle.tag.checkIncompatible(['R from subtopic', 'R to subtopic'], params.tags)) {
				return;
			}
			if (Twinkle.tag.checkIncompatible([
				'R to category namespace',
				'R to help namespace',
				'R to main namespace',
				'R to portal namespace',
				'R to project namespace',
				'R to user namespace'
			], params.tags)) {
				return;
			}
			break;

		default:
			alert('Twinkle.tag: mode tidak diketahui ' + Twinkle.tag.mode);
			break;
	}

	// File/redirect: return if no tags selected
	// Article: return if no tag is selected and no already present tag is deselected
	if (params.tags.length === 0 && (Twinkle.tag.mode !== 'article' || params.tagsToRemove.length === 0)) {
		alert('Anda harus memilh setidaknya satu tag!');
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
	Morebits.wiki.actionCompleted.notice = 'Menandai selesai, memuat kembali artikel dalam beberapa saat';
	if (Twinkle.tag.mode === 'redirect') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	const wikipediaPage = new Morebits.wiki.Page(Morebits.pageNameNorm, 'Menandai ' + Twinkle.tag.mode);
	wikipediaPage.setCallbackParameters(params);
	wikipediaPage.setChangeTags(Twinkle.changeTags); // Here to apply to triage
	wikipediaPage.load(Twinkle.tag.callbacks[Twinkle.tag.mode]);

};

Twinkle.addInitCallback(Twinkle.tag, 'tag');
}());
// </nowiki>
