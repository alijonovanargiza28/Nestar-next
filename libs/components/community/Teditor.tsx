import React, { useMemo, useRef, useState } from 'react';
import { Box, Button, FormControl, MenuItem, Stack, Typography, Select, TextField } from '@mui/material';
import { BoardArticleCategory } from '../../enums/board-article.enum';
import { Editor } from '@toast-ui/react-editor';
import { getJwtToken } from '../../auth';
import { Messages, REACT_APP_API_URL } from '../../config';
import { useRouter } from 'next/router';
import axios from 'axios';
import { T } from '../../types/common'; //@ts-ignore
import '@toast-ui/editor/dist/toastui-editor.css';
import { sweetErrorHandling, sweetTopSmallSuccessAlert } from '../../sweetAlert';
import { useMutation } from '@apollo/client';
import { CREATE_BOARD_ARTICLE } from '../../../apollo/user/mutation';

const TuiEditor = () => {
	const editorRef = useRef<Editor>(null);
	const token = getJwtToken();
	const router = useRouter();

	const [articleCategory, setArticleCategory] = useState<BoardArticleCategory>(BoardArticleCategory.FREE);

	/** APOLLO REQUESTS **/

	const [createBoardArticle] = useMutation(CREATE_BOARD_ARTICLE);

	const memoizedValues = useMemo(() => {
		const articleTitle = '';
		const articleContent = '';
		const articleImage = '';

		return {
			articleTitle,
			articleContent,
			articleImage,
		};
	}, []);

	/** HANDLERS **/

	const uploadImage = async (image: any) => {
		try {
			const formData = new FormData();

			formData.append(
				'operations',
				JSON.stringify({
					query: `
						mutation ImageUploader(
							$file: Upload!,
							$target: String!
						) {
							imageUploader(
								file: $file,
								target: $target
							)
						}
					`,

					variables: {
						file: null,
						target: 'article',
					},
				}),
			);

			formData.append(
				'map',
				JSON.stringify({
					'0': ['variables.file'],
				}),
			);

			formData.append('0', image);

			const response = await axios.post(`${process.env.REACT_APP_API_GRAPHQL_URL}`, formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					'apollo-require-preflight': true,
					Authorization: `Bearer ${token}`,
				},
			});

			console.log('UPLOAD IMAGE RESPONSE:', response.data);

			if (response.data?.errors?.length) {
				throw new Error(response.data.errors[0]?.message || 'Image upload failed');
			}

			const responseImage = response.data?.data?.imageUploader;

			console.log('responseImage:', responseImage);

			if (!responseImage) {
				throw new Error('Image upload failed: no image path returned');
			}

			memoizedValues.articleImage = responseImage;

			return `${REACT_APP_API_URL}/${responseImage}`;
		} catch (err) {
			console.log('Error, uploadImage:', err);

			return '';
		}
	};

	const changeCategoryHandler = (e: any) => {
		setArticleCategory(e.target.value);
	};

	const articleTitleHandler = (e: T) => {
		console.log(e.target.value);

		memoizedValues.articleTitle = e.target.value;
	};

	const handleRegisterButton = async () => {
		try {
			const editor = editorRef.current;

			const articleContent = editor?.getInstance().getHTML() as string;

			memoizedValues.articleContent = articleContent;

			console.log('ARTICLE TITLE:', memoizedValues.articleTitle);

			console.log('ARTICLE CONTENT:', memoizedValues.articleContent);

			console.log('ARTICLE IMAGE:', memoizedValues.articleImage);

			console.log('ARTICLE CATEGORY:', articleCategory);

			/**
			 * CHECK INPUTS
			 */
			if (!memoizedValues.articleTitle?.trim() || !memoizedValues.articleContent?.trim()) {
				throw new Error(Messages.INSERT_ALL_INPUTS);
			}

			/**
			 * CREATE ARTICLE
			 */
			const { data } = await createBoardArticle({
				variables: {
					input: {
						...memoizedValues,
						articleCategory,
					},
				},
			});

			console.log('CREATE BOARD ARTICLE RESPONSE:', data);

			await sweetTopSmallSuccessAlert('Article is created successfully', 700);

			await router.push({
				pathname: '/mypage',
				query: {
					category: 'myArticles',
				},
			});
		} catch (err: any) {
			console.log('CREATE BOARD ARTICLE ERROR:', err);

			await sweetErrorHandling(err);
		}
	};

	const doDisabledCheck = () => {
		if (memoizedValues.articleContent === '' || memoizedValues.articleTitle === '') {
			return true;
		}

		return false;
	};

	return (
		<Stack>
			<Stack direction="row" style={{ margin: '40px' }} justifyContent="space-evenly">
				<Box component={'div'} className={'form_row'} style={{ width: '300px' }}>
					<Typography
						style={{
							color: '#7f838d',
							margin: '10px',
						}}
						variant="h3"
					>
						Category
					</Typography>

					<FormControl
						sx={{
							width: '100%',
							background: 'white',
						}}
					>
						<Select
							value={articleCategory}
							onChange={changeCategoryHandler}
							displayEmpty
							inputProps={{
								'aria-label': 'Without label',
							}}
						>
							<MenuItem value={BoardArticleCategory.FREE}>
								<span>Free</span>
							</MenuItem>

							<MenuItem value={BoardArticleCategory.HUMOR}>Humor</MenuItem>

							<MenuItem value={BoardArticleCategory.NEWS}>News</MenuItem>

							<MenuItem value={BoardArticleCategory.RECOMMEND}>Recommendation</MenuItem>
						</Select>
					</FormControl>
				</Box>

				<Box
					component={'div'}
					style={{
						width: '300px',
						flexDirection: 'column',
					}}
				>
					<Typography
						style={{
							color: '#7f838d',
							margin: '10px',
						}}
						variant="h3"
					>
						Title
					</Typography>

					<TextField
						onChange={articleTitleHandler}
						id="filled-basic"
						label="Type Title"
						style={{
							width: '300px',
							background: 'white',
						}}
					/>
				</Box>
			</Stack>

			<Editor
				initialValue={'Type here'}
				placeholder={'Type here'}
				previewStyle={'vertical'}
				height={'640px'}
				// @ts-ignore
				initialEditType={'WYSIWYG'}
				toolbarItems={[
					['heading', 'bold', 'italic', 'strike'],
					['image', 'table', 'link'],
					['ul', 'ol', 'task'],
				]}
				ref={editorRef}
				hooks={{
					addImageBlobHook: async (image: any, callback: any) => {
						const uploadedImageURL = await uploadImage(image);

						if (uploadedImageURL) {
							callback(uploadedImageURL);
						}

						return false;
					},
				}}
				events={{
					load: function (param: any) {},
				}}
			/>

			<Stack direction="row" justifyContent="center">
				<Button
					variant="contained"
					color="primary"
					style={{
						margin: '30px',
						width: '250px',
						height: '45px',
					}}
					onClick={handleRegisterButton}
				>
					Register
				</Button>
			</Stack>
		</Stack>
	);
};

export default TuiEditor;
